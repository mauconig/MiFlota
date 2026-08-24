import { Pressable, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import type { MobileView } from '../useMobileView';
import { ChipRow } from '../components/ChipRow';
import { CarCard } from '../components/CarCard';
import { Pagination } from '../components/Pagination';

const PAGE_SIZE = 5;

export function Flota({ v }: { v: MobileView }) {
  const [page, setPage] = useState(0);
  const resetKey = useMemo(() => v.flota.cars.map((car) => car.id).join('|'), [v.flota.cars]);
  const pageCount = Math.max(1, Math.ceil(v.flota.cars.length / PAGE_SIZE));
  const visibleCars = v.flota.cars.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10 }}>
      <ChipRow chips={v.flota.filters} />
      <Pressable
        onPress={v.goNuevoVehiculo}
        style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#d8cdb8', backgroundColor: '#fbf7ee', borderRadius: 20, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}
      >
        <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#3d3a34" strokeWidth={2} strokeLinecap="round">
          <Path d="M5 12h14" />
          <Path d="M12 5v14" />
        </Svg>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#3d3a34' }}>Agregar vehículo</Text>
      </Pressable>
      {v.flota.cars.length === 0 && <Text style={{ paddingVertical: 30, textAlign: 'center', fontSize: 13, color: '#6b665c' }}>Ningún vehículo coincide</Text>}
      {visibleCars.map((c) => (
        <CarCard key={c.id} c={c} periodShort={v.period.short} />
      ))}
      <Pagination page={page} pageSize={PAGE_SIZE} total={v.flota.cars.length} itemLabel="vehículos" onPageChange={setPage} />
    </View>
  );
}
