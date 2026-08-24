import { Pressable, Text, View } from 'react-native';
import type { MobileView } from '../useMobileView';

export function Mas({ v }: { v: MobileView }) {
  const m = v.mas;
  const cards = [
    { title: 'Alertas', sub: m.alertCount ? `${m.alertCount} avisos para revisar` : 'No hay avisos pendientes', action: m.navAlertas, tone: m.alertCount ? '#fdf0dd' : '#e7f2ec' },
    { title: 'Choferes', sub: `${m.driverCount} personas asignadas a vehículos`, action: m.navChoferes, tone: '#eef0f8' },
    { title: 'Reportes', sub: 'Exportaciones y análisis más detallados', action: m.navReportes, tone: '#f2ede5' },
    { title: 'Perfil', sub: 'Cambiar contraseña y datos de acceso', action: m.goPerfil, tone: '#f0ece3' },
  ];
  return <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 12 }}>
    <Text style={{ paddingHorizontal: 4, color: '#6b665c', fontSize: 13 }}>Elegí una sección para continuar.</Text>
    {cards.map((item) => <Pressable key={item.title} onPress={item.action} style={{ minHeight: 86, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: item.tone, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20, fontWeight: '800', color: '#3d3a34' }}>{item.title[0]}</Text></View>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: '#6b665c', fontSize: 12, marginTop: 4 }}>{item.sub}</Text></View>
      <Text style={{ color: '#b5791a', fontSize: 22 }}>›</Text>
    </Pressable>)}
  </View>;
}
