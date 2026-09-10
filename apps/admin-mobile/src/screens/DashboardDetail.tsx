import { Pressable, Text, View } from 'react-native';
import type { MobileView } from '../useMobileView';

const PAPER = '#fffdf8';
const BORDER = '#ece4d6';
const MUTED = '#6b665c';
const INK = '#16150f';

const card = { backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16 } as const;

export function DashboardDetail({ v }: { v: MobileView }) {
  const detail = v.dashboardDetail;
  if (!detail) return null;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 14 }}>
      <View style={card}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Período</Text>
            <Text numberOfLines={1} style={{ color: INK, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{detail.periodLabel}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
            <Text style={{ color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Sección</Text>
            <Text numberOfLines={1} style={{ color: INK, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{detail.sectionLabel}</Text>
          </View>
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: '#f0ebe0', marginTop: 14, paddingTop: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: MUTED, fontSize: 12 }}>{detail.title}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} allowFontScaling={false} style={{ color: INK, fontSize: 22, fontWeight: '800', flexShrink: 1 }}>{detail.total}</Text>
        </View>
      </View>

      <View style={card}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: INK, fontSize: 16, fontWeight: '800' }}>{detail.subtitle}</Text>
            <Text style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>{detail.rows.length} {detail.rows.length === 1 ? 'resultado' : 'resultados'}</Text>
          </View>
        </View>
        {detail.rows.length === 0 ? (
          <Text style={{ color: MUTED, fontSize: 13, paddingVertical: 22, textAlign: 'center' }}>{detail.emptyLabel}</Text>
        ) : detail.rows.map((row, index) => (
          <Pressable
            key={row.id}
            disabled={!row.onPress}
            onPress={row.onPress}
            accessibilityRole={row.onPress ? 'button' : undefined}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: '#f0ebe0', opacity: pressed ? 0.72 : 1 })}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: INK, fontSize: 14, fontWeight: '700' }}>{row.label}</Text>
              <Text numberOfLines={1} style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{row.sub}</Text>
              <View style={{ height: 7, borderRadius: 4, backgroundColor: '#f0ebe0', marginTop: 8 }}>
                <View style={{ width: `${row.width}%`, height: 7, borderRadius: 4, backgroundColor: row.amountColor }} />
              </View>
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} allowFontScaling={false} style={{ width: 86, color: row.amountColor, fontSize: 13, fontWeight: '800', textAlign: 'right' }}>{row.amount}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
