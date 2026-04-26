import AsyncStorage from '@react-native-async-storage/async-storage';

export type TeacherAccount = {
  teacherId: string;
  fullName: string;
  email: string;
  department: string;
  password: string;
};

export type TeacherSession = {
  teacherId: string;
  fullName: string;
};

const USERS_KEY = 'FaceZoid_users';
const SESSION_KEY = 'FaceZoid_current_teacher';

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getStoredUsers = async (): Promise<TeacherAccount[]> => {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return safeParse<TeacherAccount[]>(raw, []);
};

export const upsertTeacher = async (teacher: TeacherAccount): Promise<void> => {
  const users = await getStoredUsers();
  const index = users.findIndex((user) => user.teacherId.toLowerCase() === teacher.teacherId.toLowerCase());
  if (index >= 0) {
    users[index] = teacher;
  } else {
    users.push(teacher);
  }
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const findTeacherForLogin = async (
  teacherId: string,
  password: string
): Promise<TeacherAccount | undefined> => {
  const users = await getStoredUsers();
  return users.find(
    (user) => user.teacherId.toLowerCase() === teacherId.toLowerCase().trim() && user.password === password
  );
};

export const setCurrentTeacher = async (session: TeacherSession): Promise<void> => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getCurrentTeacher = async (): Promise<TeacherSession | null> => {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return safeParse<TeacherSession | null>(raw, null);
};

export const clearCurrentTeacher = async (): Promise<void> => {
  await AsyncStorage.removeItem(SESSION_KEY);
};
