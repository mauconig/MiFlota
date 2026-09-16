import { Pressable, Text } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

const ICON = '#6b665c';

/** Píldora del selector de período (Dashboard y Ranking).
 *
 * Mide lo que ocupa su contenido en vez de estirarse: al no repartir el ancho
 * sobrante dentro del texto, no queda aire entre el label y los días. El
 * `flexShrink` la deja ceder cuando el label es largo, sin salirse de la fila.
 */
export function PeriodPill({ label, days, onPress, chevron = true, accessibilityLabel }: {
  label: string;
  days?: string;
  onPress: () => void;
  chevron?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Período: ${label}`}
      style={{
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fffdf8',
        borderWidth: 1,
        borderColor: '#e6ded0',
        borderRadius: 24,
        paddingVertical: 9,
        paddingHorizontal: 12,
      }}
    >
      <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={ICON} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="5" width="18" height="16" rx="3" />
        <Path d="M8 3v4" />
        <Path d="M16 3v4" />
        <Path d="M3 11h18" />
      </Svg>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.74} allowFontScaling={false} style={{ flexShrink: 1, minWidth: 0, fontSize: 13, fontWeight: '600', color: '#1a1a18' }}>{label}</Text>
      {days ? (
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} allowFontScaling={false} style={{ flexShrink: 0, fontSize: 11, fontWeight: '600', color: ICON }}>{days}</Text>
      ) : null}
      {chevron ? (
        <Svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={ICON} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m6 9 6 6 6-6" />
        </Svg>
      ) : null}
    </Pressable>
  );
}
