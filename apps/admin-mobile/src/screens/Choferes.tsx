import { Pressable, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import type { MobileView } from '../useMobileView';
import { Pagination } from '../components/Pagination';

const PAGE_SIZE = 5;

export function Choferes({ v }: { v: MobileView }) {
  const [page, setPage] = useState(0);
  const resetKey = useMemo(() => v.choferes.items.map((driver) => driver.key).join('|'), [v.choferes.items]);
  const pageCount = Math.max(1, Math.ceil(v.choferes.items.length / PAGE_SIZE));
  const visibleDrivers = v.choferes.items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  return <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 10 }}>
    <Text style={{ paddingHorizontal: 4, color: '#6b665c', fontSize: 13 }}>Abrí un vehículo para asignar, cambiar o desvincular a su chofer.</Text>
    {v.choferes.items.length === 0 ? <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 24, alignItems: 'center' }}><Text style={{ fontSize: 16, fontWeight: '800' }}>Todavía no hay choferes</Text></View> : visibleDrivers.map((d) => <Pressable key={d.key} onPress={d.open} style={{ minHeight: 82, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f2ede5', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontWeight: '800', color: '#3d3a34' }}>{d.initials}</Text></View><View style={{ flex: 1 }}><Text style={{ fontSize: 15, fontWeight: '800' }}>{d.name}</Text><Text style={{ color: '#6b665c', fontSize: 12, marginTop: 3 }}>{d.cars}</Text><Text style={{ color: '#6b665c', fontSize: 11, marginTop: 2 }}>{d.cuota}</Text></View><Text style={{ fontSize: 20, color: '#b5791a' }}>›</Text></Pressable>)}
    <Pagination page={page} pageSize={PAGE_SIZE} total={v.choferes.items.length} itemLabel="choferes" onPageChange={setPage} />
  </View>;
}
