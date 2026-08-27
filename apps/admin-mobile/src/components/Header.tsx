import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { initials } from '../format';

const iconBtnStyle = { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e6ded0', backgroundColor: '#fffdf8', alignItems: 'center' as const, justifyContent: 'center' as const };

export function TabHeader({ title, sub, onAssistant, onProfile, onRefresh, refreshing, nombre }: { title: string; sub: string; onAssistant: () => void; onProfile: () => void; onRefresh: () => void; refreshing: boolean; nombre: string }) {
  return (
    <View style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>{title}</Text>
        <Text style={{ fontSize: 12, color: '#6b665c', marginTop: 1 }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Pressable onPress={onRefresh} disabled={refreshing} accessibilityLabel="Actualizar datos" style={[iconBtnStyle, refreshing && { opacity: 0.55 }]}>
        {refreshing ? <ActivityIndicator size="small" color="#1a1a18" /> : (
          <Svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="#1a1a18" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 11a8 8 0 0 0-14.7-4L4 9" />
            <Path d="M4 4v5h5" />
            <Path d="M4 13a8 8 0 0 0 14.7 4L20 15" />
            <Path d="M20 20v-5h-5" />
          </Svg>
        )}
      </Pressable>
      <Pressable onPress={onAssistant} accessibilityLabel="Abrir asistente MiFlota" style={iconBtnStyle}>
        <Svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="#1a1a18" strokeWidth={1.8} strokeLinecap="round">
          <Path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z" />
          <Path d="m18.5 13 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" />
          <Path d="m5 12 .7 1.8 1.8.7-1.8.7L5 18l-.7-1.8-1.8-.7 1.8-.7Z" />
        </Svg>
      </Pressable>
      <Pressable onPress={onProfile} accessibilityLabel="Perfil" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#f7dfae', fontSize: 14, fontWeight: '700' }}>{initials(nombre)}</Text>
      </Pressable>
    </View>
  );
}

export function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ paddingTop: 8, paddingHorizontal: 14, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={onBack} accessibilityLabel="Volver" style={iconBtnStyle}>
        <Svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="#1a1a18" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m12 19-7-7 7-7" />
          <Path d="M19 12H5" />
        </Svg>
      </Pressable>
      <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: -0.2 }}>{title}</Text>
    </View>
  );
}
