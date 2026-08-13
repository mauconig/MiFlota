import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../theme';

export function TabHeader({ title, sub, initials, onPerfil }: { title: string; sub: string; initials: string; onPerfil: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: COLORS.text }}>{title}</Text>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>{sub}</Text>
      </View>
      <Pressable onPress={onPerfil} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgDark, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#f7dfae' }}>{initials}</Text>
      </Pressable>
    </View>
  );
}

export function SubHeader({ title }: { title: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: insets.top + 22, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable
        onPress={() => router.back()}
        style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke={COLORS.textSoft} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m12 19-7-7 7-7" />
          <Path d="M19 12H5" />
        </Svg>
      </Pressable>
      <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: -0.2, color: COLORS.text }}>{title}</Text>
    </View>
  );
}
