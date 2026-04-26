from typing import Any

from config import CONFIDENCE_THRESHOLD


FACE_IDENTIFIER_KEYS = ("roll", "roll_no", "rollNo", "student_roll", "studentRoll", "label", "name")


def get_face_identifier(face: dict) -> str:
    for key in FACE_IDENTIFIER_KEYS:
        value = face.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def recognize(pipeline: Any, image: Any):
    result = pipeline.recognize(image)
    faces = result.get("faces", [])
    faces_detected = result.get("faces_detected", len(faces))

    if faces_detected == 0:
        return False, "No face detected"

    recognized_by_identifier = {}

    for face in faces:
        confidence = float(face.get("confidence", 0.0))
        identifier = get_face_identifier(face)

        if not identifier or identifier == "Unknown" or confidence < CONFIDENCE_THRESHOLD:
            continue

        current = recognized_by_identifier.get(identifier)
        if current is None or confidence > float(current.get("confidence", 0.0)):
            recognized_by_identifier[identifier] = face

    if not recognized_by_identifier:
        return False, "No known face detected"

    recognized_faces = list(recognized_by_identifier.values())
    recognized_faces.sort(key=lambda face: float(face.get("confidence", 0.0)), reverse=True)

    return True, {
        "faces_detected": faces_detected,
        "recognized_faces": recognized_faces,
        "debug": {
            "threshold": CONFIDENCE_THRESHOLD,
            "faces_returned_by_pipeline": len(faces),
            "recognized_faces_after_filter": len(recognized_faces),
        },
    }
