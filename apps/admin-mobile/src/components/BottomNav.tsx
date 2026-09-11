import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MobileView } from '../useMobileView';

const tabBtn = { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 4, paddingVertical: 6, minHeight: 48 };

export function BottomNav({ v }: { v: MobileView }) {
  const c = v.tabActive;
  const color = (on: boolean) => (on ? '#16150f' : '#6b665c');
  // El fondo tiene que llegar hasta el borde real de la pantalla, no quedar
  // flotando arriba de la barra de gestos: el padding de abajo es el propio
  // (14) más lo que pida el inset del teléfono, no un hueco aparte.
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: '#fffdf8', borderTopWidth: 1, borderTopColor: '#ece4d6', flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 14 + insets.bottom, paddingHorizontal: 6 }}>
      <Pressable onPress={v.navDash} style={tabBtn}>
        <Svg viewBox="0 0 24 24" width={21} height={21} fill={c.dash ? color(true) : 'none'} stroke={color(c.dash)} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </Svg>
        <Text style={{ fontSize: 10, fontWeight: '600', color: color(c.dash) }}>Inicio</Text>
      </Pressable>
      <Pressable onPress={v.navIngresos} style={tabBtn}>
        <Svg viewBox="0 0 24 24" width={21} height={21} fill="none" stroke={color(c.ingresos)} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
          <Path d="M9 8h6M9 12h6M9 16h3" />
        </Svg>
        <Text style={{ fontSize: 10, fontWeight: '600', color: color(c.ingresos) }}>Ingresos</Text>
      </Pressable>
      <View style={{ width: 72, alignItems: 'center' }}>
        <Pressable
          onPress={v.registroChoice.show}
          accessibilityLabel="Registrar"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#e8a13a',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#e8a13a',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.42,
            shadowRadius: 16,
            elevation: 6,
          }}
        >
          <Svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#16150f" strokeWidth={2.2} strokeLinecap="round">
            <Path d="M5 12h14" />
            <Path d="M12 5v14" />
          </Svg>
        </Pressable>
      </View>
      <Pressable onPress={v.navGastos} style={tabBtn}>
        <Svg viewBox="0 0 24 24" width={21} height={21} fill="none" stroke={color(c.gastos)} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 5h16M4 12h16M4 19h16" />
        </Svg>
        <Text style={{ fontSize: 10, fontWeight: '600', color: color(c.gastos) }}>Gastos</Text>
      </Pressable>
      <Pressable onPress={v.navMas} style={tabBtn}>
        <Svg viewBox="0 0 24 24" width={21} height={21} fill="none" stroke={color(c.mas)} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="5" cy="12" r="1" fill={color(c.mas)} stroke="none" />
          <Circle cx="12" cy="12" r="1" fill={color(c.mas)} stroke="none" />
          <Circle cx="19" cy="12" r="1" fill={color(c.mas)} stroke="none" />
        </Svg>
        <Text style={{ fontSize: 10, fontWeight: '600', color: color(c.mas) }}>Más</Text>
      </Pressable>
    </View>
  );
}
