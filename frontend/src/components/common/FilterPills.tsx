import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ListFilter } from '@/src/features/attendance/types';

export function FilterPills({
  total,
  present,
  absent,
  filter,
  onChange,
}: {
  total: number;
  present: number;
  absent: number;
  filter: ListFilter;
  onChange: (f: ListFilter) => void;
}) {
  return (
    <View style={styles.row}>
      <Pill label={`All (${total})`} active={filter === 'all'} onPress={() => onChange('all')} />
      <Pill label={`Present (${present})`} active={filter === 'present'} onPress={() => onChange('present')} />
      <Pill label={`Absent (${absent})`} active={filter === 'absent'} onPress={() => onChange('absent')} />
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.pill, active ? styles.active : undefined]} onPress={onPress}>
      <Text style={[styles.label, active ? styles.activeLabel : undefined]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#24507B',
    borderRadius: 20,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121C34',
    paddingHorizontal: 6,
  },
  active: { backgroundColor: '#13335A', borderColor: '#1BA4ED' },
  label: { color: '#9AB0CB', fontSize: 11, fontWeight: '700' },
  activeLabel: { color: '#CBE8FF' },
});
