import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function ScannerControls({
  scanning,
  canDownload,
  downloading,
  onPrimary,
  onDownload,
  onSwitchCamera,
  onReset,
}: {
  scanning: boolean;
  canDownload: boolean;
  downloading: boolean;
  onPrimary: () => void;
  onDownload: () => void;
  onSwitchCamera: () => void;
  onReset: () => void;
}) {
  return (
    <View style={styles.actions}>
      <Pressable style={styles.primaryAction} onPress={onPrimary}>
        <Feather name={scanning ? 'square' : 'play'} size={16} color="#011827" />
        <Text style={styles.primaryActionText}>{scanning ? 'Stop Scanning' : 'Start Scanning'}</Text>
      </Pressable>
      <Pressable
        style={[styles.smallAction, !canDownload && styles.smallActionDisabled]}
        onPress={onDownload}
        disabled={!canDownload || downloading}
      >
        <Feather name={downloading ? 'loader' : 'download'} size={18} color={canDownload ? '#1BA4ED' : '#5A6B85'} />
      </Pressable>
      <Pressable style={styles.smallAction} onPress={onSwitchCamera}>
        <Feather name="camera" size={18} color="#1BA4ED" />
      </Pressable>
      <Pressable style={styles.smallAction} onPress={onReset}>
        <Feather name="rotate-ccw" size={18} color="#1BA4ED" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  primaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#1AA3E6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: { color: '#031321', fontWeight: '800', fontSize: 14 },
  smallAction: { width: 54, borderWidth: 1, borderColor: '#1AA3E6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  smallActionDisabled: { borderColor: '#5A6B85' },
});
