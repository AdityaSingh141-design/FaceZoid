import { StudentBase } from '@/src/features/attendance/types';
import { API_BASE_URL } from '@/src/features/recognition/api';

type StudentApiRecord = {
  name: string;
  roll: string | number;
};

type StudentsApiResponse = {
  students: StudentApiRecord[];
};

export async function fetchStudents(section: string): Promise<StudentBase[]> {
  const res = await fetch(`${API_BASE_URL}/students/${section}`);

  if (!res.ok) {
    throw new Error('Failed to fetch students');
  }

  const data = (await res.json()) as StudentsApiResponse;

  return data.students.map((s) => ({
    name: s.name,
    rollNo: String(s.roll),
  }));
}
