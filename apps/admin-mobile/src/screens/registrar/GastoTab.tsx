import { Pressable, Text, TextInput, View } from 'react-native';
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
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Repuestos / ítems</Text>
        {r.items.map((item, index) => (
          <View key={index} style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 16, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput value={item.nombre} onChangeText={(v) => r.setItem(index, { nombre: v })} placeholder="Nombre del repuesto" style={{ flex: 1, fontSize: 13, color: '#3d3a34', padding: 0 }} />
              {r.items.length > 1 && <Pressable onPress={() => r.removeItem(index)}><Text style={{ color: '#c0553f', fontWeight: '700' }}>Quitar</Text></Pressable>}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={item.cantidad} onChangeText={(v) => r.setItem(index, { cantidad: v.replace(/\D/g, '') })} placeholder="Cantidad" keyboardType="number-pad" style={{ flex: 1, borderWidth: 1, borderColor: '#e6ded0', borderRadius: 10, padding: 9, fontSize: 13 }} />
              <TextInput value={item.costoUnitario} onChangeText={(v) => r.setItem(index, { costoUnitario: v.replace(/\D/g, '') })} placeholder="Costo unitario" keyboardType="number-pad" style={{ flex: 2, borderWidth: 1, borderColor: '#e6ded0', borderRadius: 10, padding: 9, fontSize: 13 }} />
            </View>
          </View>
        ))}
        <Pressable onPress={r.addItem} style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: '#d9cdb8', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b665c' }}>+ Agregar ítem</Text>
        </Pressable>
        <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 16, padding: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#3d3a34', marginBottom: 6 }}>Mano de obra</Text>
          <TextInput value={r.manoObra} onChangeText={r.setManoObra} placeholder="Opcional" keyboardType="number-pad" style={{ fontSize: 14, color: '#3d3a34', padding: 0 }} />
        </View>
      </View>
      <FileDrop file={r.comprobante} onChange={r.setComprobante} />
    </>
  );
}
