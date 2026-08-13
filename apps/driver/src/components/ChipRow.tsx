import { Pressable, Text, View } from 'react-native';
import { COLORS } from '../theme';

export interface Chip {
  label: string;
  sub?: string;
  selected: boolean;
  pick: () => void;
}

/** Fondo/borde/texto de un chip según si está elegido — mismo patrón para
 *  días de pago, medio de pago, categoría y urgencia. */
export const chipStyle = (on: boolean) => ({
  bg: on ? COLORS.bgDark : COLORS.card,
  fg: on ? COLORS.onDark : COLORS.textSoft,
  bd: on ? COLORS.bgDark : COLORS.cardBorder,
  subFg: on ? COLORS.onDarkMuted : COLORS.textMuted,
});

export function ChipRow({ chips, wrap = true }: { chips: Chip[]; wrap?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: 8 }}>
      {chips.map((c, i) => {
        const s = chipStyle(c.selected);
        return (
          <Pressable
            key={i}
            onPress={c.pick}
            style={{ borderWidth: 1, borderColor: s.bd, backgroundColor: s.bg, borderRadius: 16, minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: s.fg }}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Variante de una fila, borde a borde, con label a la izquierda y una
 *  subetiqueta a la derecha — la usan "Forma de pago" y "Gravedad". */
export function ChipList({ chips }: { chips: Chip[] }) {
  return (
    <View style={{ gap: 8 }}>
      {chips.map((c, i) => {
        const s = chipStyle(c.selected);
        return (
          <Pressable
            key={i}
            onPress={c.pick}
            style={{ borderWidth: 1, borderColor: s.bd, backgroundColor: s.bg, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: s.fg }}>{c.label}</Text>
            {!!c.sub && <Text style={{ fontSize: 11, color: s.subFg }}>{c.sub}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}
