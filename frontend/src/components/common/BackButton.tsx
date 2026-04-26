import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

export function BackButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Feather name="arrow-left-circle" size={20} color="#D9E8FF" />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#13213D',
    borderWidth: 1,
    borderColor: '#2A3F63',
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  text: { color: '#D9E8FF', fontSize: 15, fontWeight: '600' },
});
