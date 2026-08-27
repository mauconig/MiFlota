import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { MobileView } from '../useMobileView';

type MoreIcon = 'alertas' | 'choferes' | 'reportes' | 'perfil';

function MoreIcon({ name }: { name: MoreIcon }) {
  const common = { fill: 'none' as const, stroke: '#3d3a34', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'alertas') return <Svg viewBox="0 0 24 24" width={23} height={23} {...common}><Path d="m10.3 3.6-8.5 14.4a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" /><Path d="M12 9v4" /><Path d="M12 17h.01" /></Svg>;
  if (name === 'choferes') return <Svg viewBox="0 0 24 24" width={23} height={23} {...common}><Circle cx="9" cy="8" r="3.5" /><Path d="M2.8 20c.6-3.2 2.7-5 6.2-5s5.6 1.8 6.2 5" /><Path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6" /><Path d="M17 15c2.6.4 4.1 2 4.5 5" /></Svg>;
  if (name === 'reportes') return <Svg viewBox="0 0 24 24" width={23} height={23} {...common}><Rect x="4" y="3" width="16" height="18" rx="2" /><Path d="M8 16v-3" /><Path d="M12 16V9" /><Path d="M16 16v-5" /><Path d="M8 7h4" /></Svg>;
  return <Svg viewBox="0 0 24 24" width={23} height={23} {...common}><Circle cx="12" cy="8" r="3.5" /><Path d="M4.5 20c.8-3.6 3.3-5.5 7.5-5.5s6.7 1.9 7.5 5.5" /></Svg>;
}

export function Mas({ v }: { v: MobileView }) {
  const m = v.mas;
  const cards = [
    { title: 'Alertas', sub: m.alertCount ? `${m.alertCount} avisos para revisar` : 'No hay avisos pendientes', action: m.navAlertas, tone: m.alertCount ? '#fdf0dd' : '#e7f2ec', icon: 'alertas' as const },
    { title: 'Choferes', sub: `${m.driverCount} personas asignadas a vehículos`, action: m.navChoferes, tone: '#eef0f8', icon: 'choferes' as const },
    { title: 'Reportes', sub: 'Exportaciones y análisis más detallados', action: m.navReportes, tone: '#f2ede5', icon: 'reportes' as const },
    { title: 'Perfil', sub: 'Cambiar contraseña y datos de acceso', action: m.goPerfil, tone: '#f0ece3', icon: 'perfil' as const },
  ];
  return <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 12 }}>
    <Text style={{ paddingHorizontal: 4, color: '#6b665c', fontSize: 13 }}>Elegí una sección para continuar.</Text>
    {cards.map((item) => <Pressable key={item.title} onPress={item.action} style={{ minHeight: 86, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: item.tone, alignItems: 'center', justifyContent: 'center' }}><MoreIcon name={item.icon} /></View>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: '#6b665c', fontSize: 12, marginTop: 4 }}>{item.sub}</Text></View>
      <Text style={{ color: '#b5791a', fontSize: 22 }}>›</Text>
    </Pressable>)}
  </View>;
}
