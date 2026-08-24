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
      <Pressable onPress={v.navFlota} style={tabBtn}>
        <Svg viewBox="0 0 24 24" width={21} height={21} fill="none" stroke={color(c.flota)} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H8.5c-.6 0-1.2.3-1.6.8L4.5 10.6c-.9.2-1.5 1-1.5 1.9v3.5c0 .6.4 1 1 1h2" />
          <Circle cx="7" cy="17" r="2" />
          <Path d="M9 17h6" />
          <Circle cx="17" cy="17" r="2" />
        </Svg>
        <Text style={{ fontSize: 10, fontWeight: '600', color: color(c.flota) }}>Vehículos</Text>
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
