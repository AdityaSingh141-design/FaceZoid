import { Section } from '@/src/features/attendance/types';
import { API_BASE_URL } from '@/src/features/recognition/api';

type SectionApiRecord = {
  section_name: string;
  department: string;
  semester: string | number;
};

type SectionsApiResponse = {
  sections: SectionApiRecord[];
};

export async function fetchSections(classroom: string): Promise<Section[]> {
  const res = await fetch(`${API_BASE_URL}/sections/${classroom}`);

  if (!res.ok) {
    throw new Error('Failed to fetch sections');
  }

  const data = (await res.json()) as SectionsApiResponse;

  return data.sections.map((s) => ({
    id: s.section_name,
    name: s.section_name,
    title: `${s.department} - ${s.semester} Semester`,
  }));
}
