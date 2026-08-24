import { Pressable, Text, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';

export function NuevoVehiculoConfirmSheet({ v }: { v: MobileView }) {
  const c = v.nuevoVehiculo.confirm;
  if (!c.open) return null;
  return (
    <BottomSheet title={v.nuevoVehiculo.editando ? 'Confirmar cambios' : 'Confirmar vehículo nuevo'} onClose={c.cancelar}>
      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 18, paddingHorizontal: 14 }}>
        {c.resumen.map((row, i) => (
          <View
            key={row.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              paddingVertical: 11,
              borderBottomWidth: i === c.resumen.length - 1 ? 0 : 1,
              borderBottomColor: '#f4efe4',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b665c' }}>{row.label}</Text>
            <Text style={{ fontSize: 13, color: '#1a1a18', textAlign: 'right', flexShrink: 1, marginLeft: 12 }} numberOfLines={1}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={c.confirmar}
        disabled={c.guardando}
        style={{ borderRadius: 18, backgroundColor: '#16150f', minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: c.guardando ? 0.7 : 1 }}
      >
        <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>{c.guardando ? 'Guardando…' : v.nuevoVehiculo.editando ? 'Confirmar cambios' : 'Confirmar y agregar'}</Text>
      </Pressable>
      <Pressable
        onPress={c.cancelar}
        disabled={c.guardando}
        style={{ borderWidth: 1, borderColor: '#e0d6c4', borderRadius: 18, backgroundColor: '#fffdf8', minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#3d3a34', fontSize: 13, fontWeight: '600' }}>Volver a editar</Text>
      </Pressable>
    </BottomSheet>
  );
}
