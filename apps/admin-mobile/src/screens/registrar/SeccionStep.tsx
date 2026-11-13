import { Pressable, Text, View } from 'react-native';
import type { MobileView } from '../../useMobileView';
import { BrandIcon } from '../../components/BrandIcon';
import { NoCarIcon } from '../../components/NoCarIcon';

type Opcion = NonNullable<MobileView['registrar']>['secciones'][number];

const INK = '#16150f';
const PAPER = '#fffdf8';

/** Primer paso de ingreso/egreso: grilla de secciones (2 por fila) y, abajo,
 *  "Sin auto" a lo ancho. Tocar una opción ya avanza al paso siguiente. */
export function SeccionStep({ opciones }: { opciones: Opcion[] }) {
  const secciones = opciones.filter((o) => o.id !== 'none');
  const sinAuto = opciones.find((o) => o.id === 'none');
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {secciones.map((o) => <SeccionCard key={o.id} o={o} />)}
      </View>
      {sinAuto && <SinAutoCard o={sinAuto} />}
    </View>
  );
}

function SeccionCard({ o }: { o: Opcion }) {
  return (
    <Pressable
      onPress={o.pick}
      accessibilityRole="button"
      accessibilityState={{ selected: o.selected }}
      accessibilityLabel={`${o.label}, ${o.sub}`}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: '45%',
        minHeight: 112,
        borderRadius: 22,
        borderWidth: o.selected ? 2 : 1,
        borderColor: o.selected ? INK : '#ece4d6',
        backgroundColor: o.selected ? '#f4efe4' : PAPER,
        padding: 14,
        justifyContent: 'space-between',
        gap: 12,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        shadowColor: '#5c4a2a',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: o.color + '1f', alignItems: 'center', justifyContent: 'center' }}>
          {o.brand ? (
            <BrandIcon brand={o.brand} size={30} color={o.color} />
          ) : (
            <Text allowFontScaling={false} style={{ color: o.color, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>{o.initials}</Text>
          )}
        </View>
        {o.selected && (
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
            <Text allowFontScaling={false} style={{ color: PAPER, fontSize: 12, fontWeight: '800' }}>✓</Text>
          </View>
        )}
      </View>
      <View style={{ gap: 3 }}>
        <Text numberOfLines={1} style={{ color: INK, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 }}>{o.label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: o.color }} />
          <Text style={{ color: '#6b665c', fontSize: 12, fontWeight: '600' }}>{o.sub}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function SinAutoCard({ o }: { o: Opcion }) {
  return (
    <Pressable
      onPress={o.pick}
      accessibilityRole="button"
      accessibilityState={{ selected: o.selected }}
      accessibilityLabel={`${o.label}. ${o.sub}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 72,
        borderRadius: 22,
        borderWidth: o.selected ? 2 : 1.5,
        borderStyle: o.selected ? 'solid' : 'dashed',
        borderColor: o.selected ? INK : '#cfc3ac',
        backgroundColor: o.selected ? '#f4efe4' : '#faf6ee',
        paddingHorizontal: 14,
        paddingVertical: 12,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: o.selected ? INK : '#ece4d6', alignItems: 'center', justifyContent: 'center' }}>
        <NoCarIcon color={o.selected ? PAPER : '#5f5a51'} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: INK, fontSize: 16, fontWeight: '800' }}>{o.label}</Text>
        <Text style={{ color: '#6b665c', fontSize: 12, lineHeight: 16 }}>{o.sub}</Text>
      </View>
      <Text allowFontScaling={false} style={{ color: '#9b9386', fontSize: 22, fontWeight: '600' }}>›</Text>
    </Pressable>
  );
}
