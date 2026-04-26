import { Feather } from '@expo/vector-icons';
import { Text, View, StyleSheet } from 'react-native';

export function AppHeader({ title, subtitle, topPadding }: { title: string; subtitle?: string; topPadding: number }) {
  return (
    <View style={[styles.header, { paddingTop: topPadding }]}>
      <View style={styles.left}>
        <View style={styles.logo}>
          <Feather name="smile" size={18} color="#D8EEFF" />
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#121B33', borderBottomWidth: 1, borderBottomColor: '#1A2744', paddingHorizontal: 16, paddingBottom: 7 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#0F8CDC', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F8FAFC', fontSize: 19, fontWeight: '800' },
  subtitle: { color: '#97A6BC', fontSize: 11 },
});
