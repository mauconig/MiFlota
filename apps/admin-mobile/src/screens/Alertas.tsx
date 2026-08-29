import { Pressable, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import type { MobileView } from '../useMobileView';
import { ChipRow } from '../components/ChipRow';
import { Pagination } from '../components/Pagination';

const PAGE_SIZE = 6;
type AlertFilter = 'todos' | 'Service' | 'Seguro' | 'Taller' | 'Kilometraje' | 'Reporte';
const FILTERS: { key: AlertFilter; label: string }[] = [
  { key: 'todos', label: 'Todas' },
  { key: 'Service', label: 'Service' },
  { key: 'Seguro', label: 'Seguro' },
  { key: 'Taller', label: 'Taller' },
  { key: 'Kilometraje', label: 'Kilometraje' },
  { key: 'Reporte', label: 'Reportes' },
];

export function Alertas({ v }: { v: MobileView }) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<AlertFilter>('todos');
  const [query, setQuery] = useState('');
  const resetKey = useMemo(() => v.alertas.items.map((alert) => alert.key).join('|'), [v.alertas.items]);
  const filteredByKind = filter === 'todos' ? v.alertas.items : v.alertas.items.filter((alert) => alert.kind === filter);
  const needle = query.trim().toLowerCase();
  const filteredAlerts = needle ? filteredByKind.filter((alert) => alert.searchText.includes(needle)) : filteredByKind;
  const pageCount = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));
  const visibleAlerts = filteredAlerts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const filterChips = FILTERS.map((item) => ({
    label: item.label,
    bg: filter === item.key ? '#16150f' : '#fffdf8',
    fg: filter === item.key ? '#fffdf8' : '#5f5a51',
    bd: filter === item.key ? '#16150f' : '#e6ded0',
    pick: () => setFilter(item.key),
  }));

  useEffect(() => {
    setPage(0);
  }, [resetKey, filter]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const emptyAll = v.alertas.items.length === 0;
  const emptyFiltered = filteredAlerts.length === 0;
  const selectedLabel = FILTERS.find((item) => item.key === filter)?.label.toLowerCase() ?? 'este tipo';

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 10 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por chapa, chofer, categoría o texto"
        style={{ minHeight: 44, borderWidth: 1, borderColor: '#e6ded0', borderRadius: 15, backgroundColor: '#fffdf8', paddingHorizontal: 14, fontSize: 13, color: '#16150f' }}
      />
      <ChipRow chips={filterChips} />

      {emptyFiltered ? (
        <View style={{ backgroundColor: emptyAll ? '#e7f2ec' : '#fffdf8', borderWidth: emptyAll ? 0 : 1, borderColor: '#ece4d6', borderRadius: 20, padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '800' }}>{emptyAll ? 'Todo al día' : 'Sin alertas de este tipo'}</Text>
          <Text style={{ color: '#6b665c', marginTop: 5, textAlign: 'center' }}>
            {emptyAll ? 'No hay avisos de service, seguro o kilometraje.' : `No hay alertas de ${selectedLabel}.`}
          </Text>
        </View>
      ) : (
        visibleAlerts.map((a) => (
          <Pressable
            key={a.key}
            onPress={a.open}
            style={{ minHeight: 72, backgroundColor: a.sev > 1 ? '#fdeeea' : '#fdf6e8', borderWidth: 1, borderColor: a.sev > 1 ? '#f4d9d2' : '#f2e4c6', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: a.sev > 1 ? '#c0553f' : '#d08a21' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800' }}>{a.kind} · {a.plate}</Text>
              <Text style={{ fontSize: 12, color: '#6b665c', marginTop: 3 }}>{a.text}</Text>
            </View>
            <Text style={{ fontSize: 20, color: '#b5791a' }}>›</Text>
          </Pressable>
        ))
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={filteredAlerts.length} itemLabel="alertas" onPageChange={setPage} />
    </View>
  );
}
