export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '');
export type BackendStatusResponse = {
  status: string;
};

export type AttendanceSessionStartResponse = {
  success: true;
  attendance_id: number;
  date: string;
  start_time: string;
};

export type AttendanceSessionStopResponse = {
  success: true;
  attendance_id: number;
  end_time: string;
};

export type RecognizedPerson = {
  roll: string;
  person: string;
  confidence: number;
};

export type RecognizeSuccessResponse = {
  success: true;
  faces_detected: number;
  recognized_people: RecognizedPerson[];
};

export type RecognizeFailureResponse = {
  success: false;
  message: string;
  faces_detected?: number;
};

export type RecognizeResponse = RecognizeSuccessResponse | RecognizeFailureResponse;

type LegacyRecognizeSuccessResponse = {
  success: true;
  person: string;
  confidence?: number;
  roll?: string | number;
  faces_detected?: number;
};

export async function getBackendStatus(): Promise<BackendStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/`);
  if (!response.ok) {
    throw new Error(`Backend status check failed with ${response.status}.`);
  }
  return (await response.json()) as BackendStatusResponse;
}

export async function startAttendanceSession(classroom: string, section: string): Promise<AttendanceSessionStartResponse> {
  const response = await fetch(`${API_BASE_URL}/attendance/session/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ classroom, section }),
  });

  const data = (await response.json()) as Partial<AttendanceSessionStartResponse> & { message?: string };

  if (!response.ok || data.success !== true || typeof data.attendance_id !== 'number') {
    throw new Error(typeof data.message === 'string' ? data.message : 'Unable to start attendance session.');
  }

  return data as AttendanceSessionStartResponse;
}

export async function stopAttendanceSession(attendanceId: number): Promise<AttendanceSessionStopResponse> {
  const response = await fetch(`${API_BASE_URL}/attendance/session/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ attendance_id: attendanceId }),
  });

  const data = (await response.json()) as Partial<AttendanceSessionStopResponse> & { message?: string };

  if (!response.ok || data.success !== true || typeof data.attendance_id !== 'number') {
    throw new Error(typeof data.message === 'string' ? data.message : 'Unable to stop attendance session.');
  }

  return data as AttendanceSessionStopResponse;
}

export async function recognizeAttendancePhoto(photoPath: string, attendanceId: number): Promise<RecognizeResponse> {
  const formData = new FormData();
  formData.append('attendance_id', String(attendanceId));
  formData.append(
    'file',
    {
      uri: `file://${photoPath}`,
      type: 'image/jpeg',
      name: 'face.jpg',
    } as unknown as Blob
  );

  const response = await fetch(`${API_BASE_URL}/recognize`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const data = (await response.json()) as
    | (Partial<RecognizeResponse> & { message?: string })
    | LegacyRecognizeSuccessResponse;
  const responseMessage = 'message' in data && typeof data.message === 'string' ? data.message : undefined;
  if (!response.ok) {
    throw new Error(responseMessage ?? `Recognition failed with ${response.status}.`);
  }

  if (
    data.success === true &&
    typeof (data as RecognizeSuccessResponse).faces_detected === 'number' &&
    Array.isArray((data as RecognizeSuccessResponse).recognized_people)
  ) {
    return data as RecognizeSuccessResponse;
  }

  if (data.success === true && typeof (data as LegacyRecognizeSuccessResponse).person === 'string') {
    const legacy = data as LegacyRecognizeSuccessResponse;

    return {
      success: true,
      faces_detected: typeof legacy.faces_detected === 'number' ? legacy.faces_detected : 1,
      recognized_people: [
        {
          roll: legacy.roll != null ? String(legacy.roll) : '',
          person: legacy.person,
          confidence: typeof legacy.confidence === 'number' ? legacy.confidence : 0,
        },
      ],
    };
  }

  if (data.success === false && responseMessage) {
    return data as RecognizeFailureResponse;
  }

  throw new Error(`Backend returned an unexpected response: ${JSON.stringify(data)}`);
}
