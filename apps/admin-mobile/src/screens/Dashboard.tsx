import { Modal, Pressable, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import type { MobileView } from '../useMobileView';
import { Sparkline } from '../components/Sparkline';
import { Donut } from '../components/Donut';
import { BarList } from '../components/BarList';
import { HealthCard } from '../components/HealthCard';
import { Pagination } from '../components/Pagination';

const card = { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 16 };
const PAGE_SIZE = 5;

function SummaryAmount({ value, fontSize }: { value: string; fontSize: number }) {
  const hasCurrency = value.startsWith('₲');
  const number = hasCurrency ? value.slice(1).trim() : value;
  return (
    <View style={{ minWidth: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
      {hasCurrency && <Text allowFontScaling={false} style={{ color: '#16150f', fontSize: Math.max(14, fontSize - 4), fontWeight: '700', marginRight: 4 }}>₲</Text>}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} allowFontScaling={false} style={{ minWidth: 0, flexShrink: 1, fontSize, fontWeight: '700', letterSpacing: -0.4, color: '#16150f' }}>{number}</Text>
    </View>
  );
}

export function Dashboard({ v }: { v: MobileView }) {
  const d = v.dashboard;
  const summaryAmountLength = Math.max(d.heroIng.length, d.heroEgr.length);
  const summaryAmountSize = summaryAmountLength > 13 ? 17 : 20;
  const [page, setPage] = useState(0);
  const [sectionOpen, setSectionOpen] = useState(false);
  const resetKey = useMemo(() => d.barMode + ':' + d.bars.map((bar) => bar.label).join('|'), [d.barMode, d.bars]);
  const pageCount = d.barMode === 'section' ? 1 : Math.max(1, Math.ceil(d.bars.length / PAGE_SIZE));
  const visibleBars = d.barMode === 'section' ? d.bars : d.bars.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

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

      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
        <Pressable onPress={v.period.openSheet} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e6ded0', borderRadius: 24, paddingVertical: 9, paddingHorizontal: 10 }}>
          <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#6b665c" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="5" width="18" height="16" rx="3" />
            <Path d="M8 3v4" />
            <Path d="M16 3v4" />
            <Path d="M3 11h18" />
          </Svg>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.74} allowFontScaling={false} style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: '600', color: '#1a1a18' }}>{v.period.compactLabel}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} allowFontScaling={false} style={{ flexShrink: 0, fontSize: 11, fontWeight: '600', color: '#6b665c' }}>{v.period.days}</Text>
          <Svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#6b665c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="m6 9 6 6 6-6" />
          </Svg>
        </Pressable>
        <Pressable onPress={() => setSectionOpen(true)} style={{ width: 104, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e6ded0', borderRadius: 24, paddingVertical: 9, paddingHorizontal: 10 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} allowFontScaling={false} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#1a1a18' }}>{v.period.sectionId == null ? 'Todas' : (v.period.sectionOptions.find((s) => s.id === v.period.sectionId)?.name ?? 'Sección')}</Text>
          <Svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#6b665c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="m6 9 6 6 6-6" />
          </Svg>
        </Pressable>
      </View>
      <Modal visible={sectionOpen} transparent animationType="fade" onRequestClose={() => setSectionOpen(false)}>
        <Pressable onPress={() => setSectionOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(22,21,15,0.28)', justifyContent: 'center', padding: 28 }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: '#fffdf8', borderRadius: 22, padding: 18, gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: 4 }}>Sección</Text>
            <Pressable onPress={() => { v.period.setSectionId(null); setSectionOpen(false); }} style={{ padding: 13, borderRadius: 12, backgroundColor: v.period.sectionId == null ? '#16150f' : '#f4efe4' }}><Text style={{ color: v.period.sectionId == null ? '#fffdf8' : '#3d3a34', fontWeight: '700' }}>Todas</Text></Pressable>
            {v.period.sectionOptions.map((section) => <Pressable key={section.id} onPress={() => { v.period.setSectionId(section.id); setSectionOpen(false); }} style={{ padding: 13, borderRadius: 12, backgroundColor: v.period.sectionId === section.id ? '#16150f' : '#f4efe4' }}><Text style={{ color: v.period.sectionId === section.id ? '#fffdf8' : '#3d3a34', fontWeight: '700' }}>{section.name}</Text></Pressable>)}
          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable onPress={() => v.openDashboardDetail('collected')} accessibilityRole="button" accessibilityLabel="Ver cobrado por vehículo" style={[card, { flex: 1, minWidth: 0 }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} allowFontScaling={false} style={{ width: '100%', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c' }}>Cobrado · {v.period.short}</Text>
          <SummaryAmount value={d.heroIng} fontSize={summaryAmountSize} />
          <View style={{ height: 4, borderRadius: 2, backgroundColor: '#2e7d5b', marginTop: 10 }} />
        </Pressable>
        <Pressable onPress={() => v.openDashboardDetail('expenses')} accessibilityRole="button" accessibilityLabel="Ver gastos por vehículo" style={[card, { flex: 1, minWidth: 0 }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} allowFontScaling={false} style={{ width: '100%', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c' }}>Gastos · {v.period.short}</Text>
          <SummaryAmount value={d.heroEgr} fontSize={summaryAmountSize} />
          <View style={{ height: 4, borderRadius: 2, backgroundColor: '#e8a13a', marginTop: 10, width: `${d.egrBarW}%` }} />
        </Pressable>
      </View>

      <Pressable onPress={() => v.openDashboardDetail('breakdown')} accessibilityRole="button" accessibilityLabel="Ver detalle de gastos" style={card}>
        <Donut d={d} />
      </Pressable>

      <View style={card}>
        <Pressable onPress={() => v.openDashboardDetail('earnings')} accessibilityRole="button" accessibilityLabel="Ver ganancia detallada">
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>{d.barMode === 'section' ? 'Ganancia por sección' : 'Ganancia por vehículo'}</Text>
          <Pressable onPress={(event) => { event.stopPropagation(); v.navGastos(); }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#b5791a' }}>Ver gastos →</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 14 }}>
          {d.bars.length === 0 ? (
            <Text style={{ fontSize: 12, color: '#6b665c' }}>{d.barMode === 'section' ? 'Sin secciones activas todavía' : 'Sin vehículos activos todavía'}</Text>
          ) : (
            <BarList bars={visibleBars.map((b) => ({ label: b.label, w: b.w, color: b.color, short: b.short }))} />
          )}
        </View>
        </Pressable>
        {d.barMode === 'vehicle' && <Pagination page={page} pageSize={PAGE_SIZE} total={d.bars.length} itemLabel="vehículos" onPageChange={setPage} />}
      </View>

      <HealthCard d={d} onPress={v.navAlertas} />
    </View>
  );
}
