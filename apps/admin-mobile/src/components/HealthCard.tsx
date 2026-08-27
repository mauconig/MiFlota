import { Pressable, Text, View } from 'react-native';
import type { MobileView } from '../useMobileView';

export function HealthCard({ d, onPress }: { d: MobileView['dashboard']; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Abrir alertas de salud de la flota" style={{ backgroundColor: '#16150f', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, borderColor: '#e8a13a', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#f7dfae', fontSize: 17, fontWeight: '700' }}>{d.health}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#a09884' }}>Salud de la flota</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fffdf8', marginTop: 2 }}>{d.healthLbl}</Text>
        <Text style={{ fontSize: 12, color: '#bdb6a4', marginTop: 1 }}>{d.healthSub}</Text>
      </View>
    </Pressable>
  );
}
