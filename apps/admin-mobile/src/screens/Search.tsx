import { Pressable, Text, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { ChipRow } from '../components/ChipRow';

interface SearchRow {
  desc: string;
  sub: string;
  amt: string;
  color: string;
  iconBg: string;
  icon: string;
  open: () => void;
}

function RowList({ rows }: { rows: SearchRow[] }) {
  return (
    <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, paddingHorizontal: 14 }}>
      {rows.map((r, i) => (
        <Pressable key={i} onPress={r.open} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f4efe4' }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: r.iconBg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: r.color, fontSize: 12, fontWeight: '700' }}>{r.icon}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
              {r.desc}
            </Text>
            <Text style={{ fontSize: 11, color: '#6b665c', marginTop: 1 }} numberOfLines={1}>
              {r.sub}
            </Text>
          </View>
          {!!r.amt && <Text style={{ fontSize: 13, fontWeight: '700', color: r.color }}>{r.amt}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

export function Search({ v }: { v: MobileView }) {
  const s = v.search;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
      {s.emptyState && (
        <View style={{ gap: 14 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Atajos</Text>
            <View style={{ gap: 8 }}>
              {s.shortcuts.map((c, i) => (
                <Pressable key={i} onPress={c.pick} style={{ borderWidth: 1, borderColor: c.bd, backgroundColor: c.bg, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 16 }}>
                  <Text style={{ color: c.fg, fontSize: 13, fontWeight: '600' }}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {s.hasRecents && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Recientes</Text>
              <ChipRow chips={s.recents.map((r) => ({ label: r.label, bg: '#fffdf8', fg: '#3d3a34', bd: '#e6ded0', pick: r.pick }))} wrap />
            </View>
          )}
        </View>
      )}

      {s.hasShortcut && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>{s.shortcutTitle}</Text>
          {s.shortcutEmpty ? <Text style={{ fontSize: 13, color: '#6b665c', paddingHorizontal: 6 }}>Nada pendiente acá. Buena señal.</Text> : <RowList rows={s.shortcutRows} />}
        </View>
      )}

      {s.hasResCars && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Autos</Text>
          <RowList rows={s.resCars} />
        </View>
      )}

      {s.hasResDrivers && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Choferes</Text>
          <RowList rows={s.resDrivers} />
        </View>
      )}

      {s.hasResMovs && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Movimientos</Text>
          <RowList rows={s.resMovs} />
        </View>
      )}

      {s.noResults && (
        <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 18, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '700' }}>{s.noResTxt}</Text>
        </View>
      )}
    </View>
  );
}
