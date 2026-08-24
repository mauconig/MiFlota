import { Pressable, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import type { MobileView } from '../useMobileView';
import { Pagination } from '../components/Pagination';

const PAGE_SIZE = 6;

export function Alertas({ v }: { v: MobileView }) {
  const [page, setPage] = useState(0);
  const resetKey = useMemo(() => v.alertas.items.map((alert) => `${alert.carId}-${alert.kind}`).join('|'), [v.alertas.items]);
  const pageCount = Math.max(1, Math.ceil(v.alertas.items.length / PAGE_SIZE));
  const visibleAlerts = v.alertas.items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  return <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 10 }}>
    {v.alertas.items.length === 0 ? <View style={{ backgroundColor: '#e7f2ec', borderRadius: 20, padding: 24, alignItems: 'center' }}><Text style={{ fontSize: 17, fontWeight: '800' }}>Todo al día</Text><Text style={{ color: '#4f6b5b', marginTop: 5 }}>No hay avisos de service, seguro o kilometraje.</Text></View> : visibleAlerts.map((a) => <Pressable key={`${a.carId}-${a.kind}`} onPress={a.open} style={{ minHeight: 72, backgroundColor: a.sev > 1 ? '#fdeeea' : '#fdf6e8', borderWidth: 1, borderColor: a.sev > 1 ? '#f4d9d2' : '#f2e4c6', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: a.sev > 1 ? '#c0553f' : '#d08a21' }} /><View style={{ flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '800' }}>{a.kind} · {a.plate}</Text><Text style={{ fontSize: 12, color: '#6b665c', marginTop: 3 }}>{a.text}</Text></View><Text style={{ fontSize: 20, color: '#b5791a' }}>›</Text></Pressable>)}
    <Pagination page={page} pageSize={PAGE_SIZE} total={v.alertas.items.length} itemLabel="alertas" onPageChange={setPage} />
  </View>;
}
