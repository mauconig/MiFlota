import { Pressable, Text, View } from 'react-native';
import type { MobileView } from '../../useMobileView';
import { ChipRow } from '../../components/ChipRow';
import { FileDrop } from '../../components/FileDrop';
import { useSelectSheet } from '../../components/SelectSheet';

export function GastoTab({ r }: { r: NonNullable<NonNullable<MobileView['registrar']>['gasto']> }) {
  const current = r.selCars.find((c) => c.id === r.carId);
  const select = useSelectSheet('Elegí un auto', r.selCars, r.setCarId);
  return (
    <>
      <View style={{ gap: 7 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Categoría</Text>
        <ChipRow chips={r.catChips} wrap />
      </View>
      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, paddingHorizontal: 14 }}>
        {r.lockCar ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }}>
            <Text style={{ width: 70, fontSize: 13, fontWeight: '600' }}>Auto</Text>
            <Text style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#3d3a34' }} numberOfLines={1}>
              {current?.label ?? '—'}
            </Text>
          </View>
        ) : (
          <Pressable onPress={select.open} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }}>
            <Text style={{ width: 70, fontSize: 13, fontWeight: '600' }}>Auto</Text>
            <Text style={{ flex: 1, textAlign: 'right', fontSize: 13, color: current ? '#3d3a34' : '#b3aa99' }} numberOfLines={1}>
              {current ? current.label : 'Elegí un auto'}
            </Text>
          </Pressable>
        )}
      </View>
      {!r.lockCar && select.sheet}
      <FileDrop file={r.comprobante} onChange={r.setComprobante} />
    </>
  );
}
