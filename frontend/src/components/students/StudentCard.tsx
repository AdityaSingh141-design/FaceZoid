import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AttendanceStatus, Student } from '@/src/features/attendance/types';

export function StudentCard({ student }: { student: Student }) {
  const tone: Record<AttendanceStatus, { color: string; bg: string; icon: keyof typeof Feather.glyphMap; text: string }> = {
    pending: { color: '#9BA9BF', bg: '#94A3B81F', icon: 'clock', text: 'Pending' },
    present: { color: '#32D488', bg: '#32D4881D', icon: 'check-circle', text: 'Present' },
    absent: { color: '#F44957', bg: '#F449571D', icon: 'x-circle', text: 'Absent' },
  };
  const t = tone[student.status];
  return (
    <View style={styles.studentCard}>
      <View style={styles.avatar}>
        <Feather name="user" size={16} color="#7E8EA4" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentRoll}>{student.rollNo}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: t.bg }]}>
        <Feather name={t.icon} size={12} color={t.color} />
        <Text style={[styles.statusText, { color: t.color }]}>{t.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  studentCard: {
    backgroundColor: '#121C34',
    borderWidth: 1,
    borderColor: '#1D2946',
    borderRadius: 12,
    minHeight: 68,
    paddingHorizontal: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1C2942', alignItems: 'center', justifyContent: 'center' },
  studentName: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  studentRoll: { color: '#93A5BE', fontSize: 11 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontSize: 10, fontWeight: '700' },
});
