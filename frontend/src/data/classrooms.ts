import { Classroom } from '@/src/features/attendance/types';
import { API_BASE_URL } from '@/src/features/recognition/api';

type ClassroomApiRecord = {
  name: string;
  block: string | number;
  floor: string | number;
};

type ClassroomsApiResponse = {
  classrooms: ClassroomApiRecord[];
};

export async function fetchClassrooms(): Promise<Classroom[]> {
  const res = await fetch(`${API_BASE_URL}/classrooms`);

  if (!res.ok) {
    throw new Error('Failed to fetch classrooms');
  }

  const data = (await res.json()) as ClassroomsApiResponse;

  return data.classrooms.map((c) => ({
    id: c.name,
    name: c.name,
    location: `Block ${c.block}, Floor ${c.floor}`,
  }));
}
