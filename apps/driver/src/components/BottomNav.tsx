import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS } from '../theme';

type IconProps = { color: string; size?: number };

const Home = ({ color, size = 21 }: IconProps) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Svg>
);

const List = ({ color, size = 21 }: IconProps) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M8 6h13" />
    <Path d="M8 12h13" />
    <Path d="M8 18h13" />
    <Path d="M3 6h.01" />
    <Path d="M3 12h.01" />
    <Path d="M3 18h.01" />
  </Svg>
);

const Alert = ({ color, size = 21 }: IconProps) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
    <Path d="M12 9v4" />
    <Path d="M12 17h.01" />
  </Svg>
);

const User = ({ color, size = 21 }: IconProps) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="8" r="4" />
    <Path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </Svg>
);

export const PagarIcon = ({ color, size = 25 }: IconProps) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2v20" />
    <Path d="M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Svg>
);

export type NavKey = 'inicio' | 'pagos' | 'reportes' | 'perfil';

interface Props {
  active: NavKey;
  onNav: (k: NavKey) => void;
  onPagar: () => void;
}

export function BottomNav({ active, onNav, onPagar }: Props) {
  const tabs: { key: NavKey; label: string; Icon: typeof Home }[] = [
    { key: 'inicio', label: 'Inicio', Icon: Home },
    { key: 'pagos', label: 'Pagos', Icon: List },
  ];
  const tabs2: { key: NavKey; label: string; Icon: typeof Home }[] = [
    { key: 'reportes', label: 'Reportes', Icon: Alert },
    { key: 'perfil', label: 'Perfil', Icon: User },
  ];

  const Item = ({ k, label, Icon }: { k: NavKey; label: string; Icon: typeof Home }) => {
    const c = active === k ? COLORS.bgDark : '#8f8a80';
    return (
      <Pressable onPress={() => onNav(k)} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 6, minHeight: 48 }}>
        <Icon color={c} />
        <Text style={{ fontSize: 10, fontWeight: '600', color: c }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flexDirection: 'row', backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.cardBorder, alignItems: 'center', paddingHorizontal: 6, paddingTop: 8, paddingBottom: 8 }}>
      {tabs.map((t) => (
        <Item key={t.key} k={t.key} label={t.label} Icon={t.Icon} />
      ))}
      <View style={{ width: 72, alignItems: 'center' }}>
        <Pressable
          onPress={onPagar}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.amber,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: COLORS.amber,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.42,
            shadowRadius: 16,
            elevation: 6,
          }}
        >
          <PagarIcon color={COLORS.bgDark} />
        </Pressable>
      </View>
      {tabs2.map((t) => (
        <Item key={t.key} k={t.key} label={t.label} Icon={t.Icon} />
      ))}
    </SafeAreaView>
  );
}
