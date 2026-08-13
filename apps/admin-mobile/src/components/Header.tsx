import { Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { initials } from '../format';

const iconBtnStyle = { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e6ded0', backgroundColor: '#fffdf8', alignItems: 'center' as const, justifyContent: 'center' as const };

export function TabHeader({ title, sub, onSearch, onProfile, nombre }: { title: string; sub: string; onSearch: () => void; onProfile: () => void; nombre: string }) {
  return (
    <View style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>{title}</Text>
        <Text style={{ fontSize: 12, color: '#6b665c', marginTop: 1 }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Pressable onPress={onSearch} accessibilityLabel="Buscar" style={iconBtnStyle}>
        <Svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="#1a1a18" strokeWidth={1.8} strokeLinecap="round">
          <Circle cx="11" cy="11" r="7" />
          <Path d="m20 20-3.6-3.6" />
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

export function SearchHeader({ q, onQ, onClear, onBack }: { q: string; onQ: (v: string) => void; onClear: () => void; onBack: () => void }) {
  return (
    <View style={{ paddingTop: 8, paddingHorizontal: 14, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={onBack} accessibilityLabel="Volver" style={iconBtnStyle}>
        <Svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="#1a1a18" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m12 19-7-7 7-7" />
          <Path d="M19 12H5" />
        </Svg>
      </Pressable>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e6ded0', borderRadius: 22, paddingHorizontal: 14, minHeight: 44 }}>
        <Svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="#6b665c" strokeWidth={1.8} strokeLinecap="round">
          <Circle cx="11" cy="11" r="7" />
          <Path d="m20 20-3.6-3.6" />
        </Svg>
        <TextInput value={q} onChangeText={onQ} placeholder="Patente, chofer, gasto o monto" autoFocus style={{ flex: 1, fontSize: 14, color: '#1a1a18', padding: 0 }} />
        {!!q && (
          <Pressable onPress={onClear} accessibilityLabel="Limpiar">
            <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#6b665c" strokeWidth={2} strokeLinecap="round">
              <Path d="M18 6 6 18" />
              <Path d="m6 6 12 12" />
            </Svg>
          </Pressable>
        )}
      </View>
    </View>
  );
}
