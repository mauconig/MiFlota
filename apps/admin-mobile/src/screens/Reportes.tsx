import { Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { MobileView } from '../useMobileView';
import { BarList } from '../components/BarList';

export function Reportes({ v }: { v: MobileView }) {
  const rep = v.reportes;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
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
        </Pressable>
      </View>
      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 22, padding: 18 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c' }}>{v.period.label}</Text>
        <Text style={{ fontSize: 32, fontWeight: '800', letterSpacing: -0.9, marginTop: 4, color: rep.netColor }}>{rep.net}</Text>
        <Text style={{ fontSize: 12, color: '#6b665c' }}>neto · {rep.nMovs} movimientos</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1, backgroundColor: '#f4f0e8', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: '#6b665c' }}>Cobrado</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#2e7d5b', marginTop: 2 }}>{rep.ing}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#f4f0e8', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: '#6b665c' }}>Gastos</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#c0553f', marginTop: 2 }}>{rep.egr}</Text>
          </View>
        </View>
      </View>
      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 22, padding: 18, gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '700' }}>Gastos por auto</Text>
        {rep.gastos.length === 0 ? <Text style={{ fontSize: 12, color: '#6b665c' }}>Sin gastos detallados en el período</Text> : rep.gastos.map((g) => (
          <View key={g.plate} style={{ borderTopWidth: 1, borderTopColor: '#f0ebe0', paddingTop: 10, gap: 7 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '700', color: '#1a1a18' }}>{g.plate}</Text><Text style={{ fontWeight: '700', color: '#c0553f' }}>{g.total}</Text></View>
            {g.rows.map((row, i) => <View key={i} style={{ backgroundColor: '#faf7f0', borderRadius: 10, padding: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 12, fontWeight: '600', flex: 1 }}>{row.desc} · {row.cat}</Text><Text style={{ fontSize: 12, fontWeight: '700' }}>{row.amount}</Text></View>
              {row.items.map((item, j) => <Text key={j} style={{ fontSize: 11, color: '#6b665c', marginTop: 3 }}>{item.cantidad} × {item.nombre} · {item.subtotal}</Text>)}
              {!!row.manoObra && <Text style={{ fontSize: 11, color: '#6b665c', marginTop: 3 }}>Mano de obra · {row.manoObra}</Text>}
            </View>)}
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 22, padding: 18 }}>
        <Text style={{ fontSize: 15, fontWeight: '700' }}>Gastos por categoría</Text>
        <View style={{ marginTop: 14 }}>
          {rep.cats.length === 0 ? (
            <Text style={{ fontSize: 12, color: '#6b665c' }}>Sin gastos en el período</Text>
          ) : (
            <BarList bars={rep.cats.map((c) => ({ label: c.cat, w: c.w, color: c.color, short: c.short }))} labelWidth={96} />
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={rep.exportPdf} style={{ flex: 1, borderRadius: 18, backgroundColor: '#16150f', minHeight: 50, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>PDF</Text>
        </Pressable>
        <Pressable onPress={rep.exportXls} style={{ flex: 1, borderWidth: 1, borderColor: '#e0d6c4', borderRadius: 18, backgroundColor: '#fffdf8', minHeight: 50, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#1a1a18', fontSize: 14, fontWeight: '700' }}>Excel</Text>
        </Pressable>
      </View>
    </View>
  );
}
