import { Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { MobileView } from '../useMobileView';
import { Sparkline } from '../components/Sparkline';
import { Donut } from '../components/Donut';
import { BarList } from '../components/BarList';
import { HealthCard } from '../components/HealthCard';

const card = { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 16 };

export function Dashboard({ v }: { v: MobileView }) {
  const d = v.dashboard;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 14 }}>
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: '#6b665c' }}>Ganancia del período · {v.period.label}</Text>
        <View style={{ alignItems: 'flex-start', gap: 2, marginTop: 2 }}>
          <Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 37, color: d.heroColor }}>{d.heroNet}</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: d.heroNet.startsWith('−') ? '#c0553f' : '#2e7d5b' }}>{d.deltaTxt}</Text>
        </View>
        <Sparkline d={d} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 2 }}>
        <Pressable onPress={v.period.openSheet} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e6ded0', borderRadius: 24, paddingVertical: 9, paddingHorizontal: 18 }}>
          <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#6b665c" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="5" width="18" height="16" rx="3" />
            <Path d="M8 3v4" />
            <Path d="M16 3v4" />
            <Path d="M3 11h18" />
          </Svg>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a18' }}>{v.period.label}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b665c' }}>{v.period.days}</Text>
          <Svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#6b665c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="m6 9 6 6 6-6" />
          </Svg>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[card, { flex: 1 }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c' }}>Cobrado · {v.period.short}</Text>
          <Text style={{ fontSize: 21, fontWeight: '700', letterSpacing: -0.4, marginTop: 4 }}>{d.heroIng}</Text>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: '#2e7d5b', marginTop: 10 }} />
        </View>
        <View style={[card, { flex: 1 }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c' }}>Gastos · {v.period.short}</Text>
          <Text style={{ fontSize: 21, fontWeight: '700', letterSpacing: -0.4, marginTop: 4 }}>{d.heroEgr}</Text>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: '#e8a13a', marginTop: 10, width: `${d.egrBarW}%` }} />
        </View>
      </View>

      <View style={card}>
        <Donut d={d} />
      </View>

      <View style={card}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>Ganancia por vehículo</Text>
          <Pressable onPress={v.navGastos}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#b5791a' }}>Ver gastos →</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 14 }}>
          {d.bars.length === 0 ? (
            <Text style={{ fontSize: 12, color: '#6b665c' }}>Sin vehículos activos todavía</Text>
          ) : (
            <BarList bars={d.bars.map((b) => ({ label: b.plate, w: b.w, color: b.color, short: b.short }))} />
          )}
        </View>
      </View>

      <HealthCard d={d} />
    </View>
  );
}
