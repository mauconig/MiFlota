import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const BORDER = '#ece4d6';
const PAPER = '#fffdf8';
const INK = '#16150f';

/** Botón de retroceso. Con `label` muestra ícono + texto; sin `label` queda
 *  cuadrado, solo con la flecha, para acompañar a "Continuar". */
export function BackButton({ onPress, label, style }: {
  onPress: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ?? 'Atrás'}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderWidth: 1,
          borderColor: BORDER,
          backgroundColor: PAPER,
          borderRadius: 16,
          ...(label ? { paddingVertical: 10, paddingHorizontal: 16 } : { width: 52, height: 52 }),
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M19 12H5" />
        <Path d="m11 18-6-6 6-6" />
      </Svg>
      {label ? <Text style={{ color: INK, fontSize: 13, fontWeight: '700' }}>{label}</Text> : null}
    </Pressable>
  );
}
