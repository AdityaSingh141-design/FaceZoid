export type AttendanceStatus = 'pending' | 'present' | 'absent';
export type ListFilter = 'all' | 'present' | 'absent';

export type Classroom = {
  id: string;
  name: string;
  location: string;
};

export type Section = {
  id: string;
  name: string;
  title: string;
};

export type Student = {
  name: string;
  rollNo: string;
  status: AttendanceStatus;
};

export type StudentBase = Omit<Student, 'status'>;

export type DetectionBox = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
  score: number;
};
