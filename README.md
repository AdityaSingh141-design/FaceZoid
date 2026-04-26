# FaceZoid

AI-powered face-recognition attendance system built with a FastAPI backend, an Expo React Native mobile app, and PostgreSQL on AWS.

FaceZoid lets a teacher select a classroom and section, start a scan session, capture frames in real time, identify students using a trained face-recognition model, and persist attendance with confidence scores and IST-based class timing.

## Features

- Real-time attendance marking from a mobile device camera
- Face-recognition backend using a serialized model from S3
- Classroom -> section -> student hierarchy
- Session-based attendance tracking with `class_attendance` and `student_attendance`
- Duplicate attendance prevention per class session
- IST-based class timing
- Scan recording download support on the mobile app
- AWS-ready deployment workflow

## System Architecture

```text
React Native App (Expo)
        |
        | Image frame + attendance session id
        v
FastAPI Backend
        |
        | Face recognition model (.pkl from S3/local)
        v
PostgreSQL
        |
        v
class_attendance + student_attendance
```

## Tech Stack

### Backend

- Python
- FastAPI
- Uvicorn
- OpenCV
- NumPy
- face_recognition
- boto3
- PostgreSQL

### Mobile App

- React Native
- Expo
- Expo Router
- Vision Camera
- Expo Media Library

### Cloud

- AWS EC2
- AWS S3
- AWS RDS / PostgreSQL

- ## Individual Contributions (Aditya Singh)

- Developed the machine learning pipeline for the face recognition attendance system.
- Trained the recognition model using student image datasets for accurate identification.
- Worked on image preprocessing and prediction workflow to improve recognition performance.
- Integrated camera capture for real-time face scanning in the mobile application.
- Achieved accurate recognition on trained student dataset.

## Database Design

### 1. `class_attendance`

Stores a single lecture/session.

```text
id
classroom
section
date
start_time
end_time
```

Behavior:

- `classroom` and `section` are stored as text values
- `date` is stored in IST
- `start_time` is rounded down to the current IST hour
- `end_time` is set to the next IST hour

Example:

```text
id: 12
classroom: A-101
section: CSE-1
date: 2026-03-16
start_time: 2026-03-16 15:00:00
end_time: 2026-03-16 16:00:00
```

### 2. `student_attendance`

Stores the students recognized in a given session.

```text
id
attendance_id
roll
confidence
timestamp
```

Relationship:

```text
class_attendance
      |
      | 1
      |
      | N
student_attendance
```

Recommended uniqueness constraint:

```sql
ALTER TABLE student_attendance
ADD CONSTRAINT unique_student_per_class
UNIQUE (attendance_id, roll);
```

## Attendance Flow

1. Teacher selects a classroom and section in the mobile app
2. Teacher presses `Start Scanning`
3. Backend creates a `class_attendance` row
4. Mobile app captures frames every second
5. Backend recognizes a student roll and confidence
6. Backend resolves student name from the `students` table
7. Backend inserts the student into `student_attendance`
8. Teacher presses `Stop Scanning`
9. Scan session closes and the mobile app can save the scan recording

Only present students are stored in the database.

## Backend API

### Health Check

```http
GET /
```

Response:

```json
{
  "status": "running"
}
```

### Get Classrooms

```http
GET /classrooms
```

### Get Sections

```http
GET /sections/{classroom}
```

### Get Students

```http
GET /students/{section}
```

### Start Attendance Session

```http
POST /attendance/session/start
```

Request:

```json
{
  "classroom": "A-101",
  "section": "CSE-1"
}
```

Response:

```json
{
  "success": true,
  "attendance_id": 12,
  "date": "2026-03-16",
  "start_time": "2026-03-16T15:00:00"
}
```

### Stop Attendance Session

```http
POST /attendance/session/stop
```

Request:

```json
{
  "attendance_id": 12
}
```

Response:

```json
{
  "success": true,
  "attendance_id": 12,
  "end_time": "2026-03-16T16:00:00"
}
```

### Recognize Students

```http
POST /recognize
Content-Type: multipart/form-data
```

Form data:

```text
attendance_id
file
```

Response:

```json
{
  "success": true,
  "faces_detected": 1,
  "recognized_people": [
    {
      "roll": "2305821",
      "person": "Subham Rungta",
      "confidence": 0.93
    }
  ]
}
```

## Project Structure

```text
FaceZoid/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── model_loader.py
│   ├── pipeline.py
│   ├── requirements.txt
│   ├── models/
│   │   └── face_recognition_pipeline.pkl
│   └── services/
│       ├── preprocessing.py
│       └── recognition.py
└── frontend/
    ├── app/
    │   ├── _layout.tsx
    │   └── (tabs)/
    │       ├── _layout.tsx
    │       ├── classrooms.tsx
    │       └── index.tsx
    ├── components/
    ├── constants/
    ├── lib/
    ├── src/
    │   ├── components/
    │   │   ├── common/
    │   │   ├── scanner/
    │   │   └── students/
    │   ├── data/
    │   └── features/
    │       ├── attendance/
    │       └── recognition/
    ├── app.json
    ├── package.json
    └── tsconfig.json
```

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/AdityaSingh141-design/FaceZoid
cd FaceZoid
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` for model and database configuration.

Run the backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Start Expo:

```bash
npm start
```

For Android development builds:

```bash
npm run android
```

Note:

- The recording/download feature uses native modules, so use a development build rather than Expo Go.
- Set `EXPO_PUBLIC_API_BASE_URL` in `frontend/.env` to your backend server URL.

## AWS Deployment

### Backend

Typical EC2 flow:

```bash
ssh -i key.pem ubuntu@EC2_IP
git clone https://github.com/AdityaSingh141-design/FaceZoid
cd FaceZoid/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Model

- Store the serialized model in S3
- Configure `BUCKET_NAME`, `MODEL_KEY`, and `LOCAL_MODEL_PATH` in `backend/.env`
- On startup, the backend downloads the model locally if it is missing

## Current Status

Implemented:

- teacher login UI
- classroom and section selection
- scan session start/stop flow
- frame upload every second
- roll-based recognition flow
- student lookup from `students`
- session-based attendance storage
- duplicate prevention per session
- scan recording save support

## Future Improvements

- timetable-driven attendance sessions
- teacher/admin dashboard
- attendance analytics and exports
- role-based authentication
- report generation

## Authors

- Aditya
- Adrij Samanta
- Rudraksh Gautam
- Sarthak Shahi
- Devansh Prasad
- Shubham Rungta
