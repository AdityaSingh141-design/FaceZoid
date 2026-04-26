from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import FastAPI, File, Form, UploadFile
from pydantic import BaseModel
import cv2
import numpy as np
import time

from database import conn, cursor
from model_loader import load_pipeline
from services.preprocessing import preprocess
from services.recognition import get_face_identifier, recognize

app = FastAPI()

pipeline = load_pipeline()
IST = ZoneInfo("Asia/Kolkata")

ATTENDANCE_COOLDOWN_SECONDS = 30
recent_attendance_cache: dict[str, float] = {}
ROLL_LOOKUP_QUERY = "SELECT roll, name FROM students WHERE CAST(roll AS TEXT)=%s LIMIT 1"
ALL_STUDENT_LOOKUP_QUERY = "SELECT roll, name FROM students"


class AttendanceSessionStartRequest(BaseModel):
    classroom: str
    section: str


class AttendanceSessionStopRequest(BaseModel):
    attendance_id: int


def status_response(message: str, **extra):
    return {"success": False, "message": message, **extra}


def normalize_roll(value: str) -> str:
    return "".join(ch.lower() for ch in str(value).strip() if ch.isalnum())


def lookup_student_by_roll(raw_roll: str):
    roll = str(raw_roll).strip()
    cursor.execute(ROLL_LOOKUP_QUERY, (roll,))
    result = cursor.fetchone()
    if result is not None:
        return str(result[0]), str(result[1])

    normalized_roll = normalize_roll(roll)
    cursor.execute(ALL_STUDENT_LOOKUP_QUERY)

    for student_roll, student_name in cursor.fetchall():
        if normalize_roll(student_roll) == normalized_roll:
            return str(student_roll), str(student_name)

    return None


def current_ist_datetime() -> datetime:
    return datetime.now(IST).replace(tzinfo=None)


def current_ist_slot() -> tuple[datetime, datetime]:
    now = current_ist_datetime()
    slot_start = now.replace(minute=0, second=0, microsecond=0)
    slot_end = slot_start + timedelta(hours=1)
    return slot_start, slot_end


def fetch_rows(query: str, params: tuple = ()) -> list[tuple]:
    cursor.execute(query, params)
    return cursor.fetchall()


def build_classroom_response(row: tuple) -> dict[str, object]:
    return {
        "name": row[0],
        "block": row[1],
        "floor": row[2],
    }


def build_section_response(row: tuple) -> dict[str, object]:
    return {
        "section_name": row[0],
        "department": row[1],
        "semester": row[2],
    }


def build_student_response(row: tuple) -> dict[str, object]:
    return {
        "roll": row[0],
        "name": row[1],
    }


def insert_or_update_attendance_record(
    attendance_id: int,
    roll: str,
    confidence: float,
    detected_at: datetime,
) -> None:
    cursor.execute(
        """
        INSERT INTO student_attendance (attendance_id, roll, confidence, timestamp)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (attendance_id, roll)
        DO UPDATE SET
            confidence = GREATEST(student_attendance.confidence, EXCLUDED.confidence),
            timestamp = %s
        """,
        (attendance_id, roll, confidence, detected_at, detected_at),
    )


@app.get("/")
def status():
    return {"status": "running"}

# -----------------------------
# CLASSROOMS API
# -----------------------------
@app.get("/classrooms")
def get_classrooms():
    rows = fetch_rows("SELECT name, block, floor FROM classrooms")
    return {"classrooms": [build_classroom_response(row) for row in rows]}


# -----------------------------
# SECTIONS API
# -----------------------------
@app.get("/sections/{classroom}")
def get_sections(classroom: str):
    rows = fetch_rows(
        "SELECT section_name, department, semester FROM sections WHERE classroom=%s",
        (classroom,),
    )
    return {"sections": [build_section_response(row) for row in rows]}


# -----------------------------
# STUDENTS API
# -----------------------------
@app.get("/students/{section}")
def get_students(section: str):
    rows = fetch_rows("SELECT roll, name FROM students WHERE section=%s", (section,))
    return {"students": [build_student_response(row) for row in rows]}


@app.post("/attendance/session/start")
def start_attendance_session(payload: AttendanceSessionStartRequest):
    now = current_ist_datetime()
    slot_start, slot_end = current_ist_slot()

    cursor.execute(
        """
        INSERT INTO class_attendance (classroom, section, date, start_time, end_time)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
        """,
        (payload.classroom, payload.section, now.date(), slot_start, slot_end)
    )

    attendance_id = int(cursor.fetchone()[0])
    conn.commit()

    return {
        "success": True,
        "attendance_id": attendance_id,
        "date": now.date().isoformat(),
        "start_time": slot_start.isoformat(),
    }


@app.post("/attendance/session/stop")
def stop_attendance_session(payload: AttendanceSessionStopRequest):
    cursor.execute(
        """
        SELECT id, end_time
        FROM class_attendance
        WHERE id=%s
        """,
        (payload.attendance_id,)
    )

    result = cursor.fetchone()

    if result is None:
        return status_response("Attendance session not found")

    attendance_id = int(result[0])
    end_time = result[1]

    if end_time is None:
        _, slot_end = current_ist_slot()
        cursor.execute(
            """
            UPDATE class_attendance
            SET end_time=%s
            WHERE id=%s
            RETURNING end_time
            """,
            (slot_end, attendance_id)
        )
        end_time = cursor.fetchone()[0]

    conn.commit()

    return {
        "success": True,
        "attendance_id": attendance_id,
        "end_time": end_time.isoformat(),
    }


# -----------------------------
# FACE RECOGNITION API
# -----------------------------
@app.post("/recognize")
async def recognize_face(
    attendance_id: int = Form(...),
    file: UploadFile = File(...),
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        return status_response("Invalid image uploaded")

    image = preprocess(image)
    success, data = recognize(pipeline, image)

    if not success:
        return status_response(data)

    recognized_faces = data["recognized_faces"]
    faces_detected = data["faces_detected"]
    debug = data.get("debug", {})
    now = time.time()
    detected_at = current_ist_datetime()
    recognized_people = []
    recognized_rolls = []

    for face in recognized_faces:
        raw_roll = get_face_identifier(face)
        if not raw_roll:
            continue

        roll = str(raw_roll).strip()
        recognized_rolls.append(roll)
        confidence = float(face["confidence"])
        student = lookup_student_by_roll(roll)
        if student is None:
            continue

        roll, name = student
        recognized_people.append({"roll": roll, "person": name, "confidence": confidence})

        # cooldown to prevent duplicate attendance
        last_marked = recent_attendance_cache.get(roll, 0.0)
        if now - last_marked < ATTENDANCE_COOLDOWN_SECONDS:
            continue

        insert_or_update_attendance_record(attendance_id, roll, confidence, detected_at)
        recent_attendance_cache[roll] = now

    conn.commit()

    if not recognized_people:
        return status_response(
            "Recognized faces were not found in database",
            faces_detected=faces_detected,
            debug=debug,
            recognized_rolls=recognized_rolls,
        )

    return {
        "success": True,
        "faces_detected": faces_detected,
        "recognized_people": recognized_people,
        "debug": debug,
    }
