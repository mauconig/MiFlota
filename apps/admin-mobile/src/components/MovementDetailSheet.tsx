import { Text, View } from 'react-native';
import type { MovementDetailView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';
import { ComprobantePreview } from './ComprobantePreview';

export function MovementDetailSheet({ movement }: { movement: MovementDetailView | null }) {
  if (!movement) return null;

  return (
    <BottomSheet title="Detalle del movimiento" onClose={movement.close}>
      <View style={{ backgroundColor: movement.typeBg, borderRadius: 18, padding: 16 }}>
        <Text style={{ color: movement.typeFg, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>{movement.type}</Text>
        <Text style={{ color: movement.amountColor, fontSize: 28, fontWeight: '800', marginTop: 5 }}>{movement.amount}</Text>
        <Text style={{ color: '#6b665c', fontSize: 13, fontWeight: '600', marginTop: 4 }} numberOfLines={2}>{movement.title}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Info label="Fecha" value={movement.date} />
        <Info label="Medio" value={movement.medio} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Info label="Vehículo" value={movement.vehicle} />
        <Info label="Chofer" value={movement.driver} />
      </View>
      <Info label="Categoría" value={movement.category} />
      {!!movement.note && <Info label="Detalle" value={movement.note} multiline />}

      {movement.comprobante && <ComprobantePreview source={movement.comprobante} />}

      {!!movement.items.length && (
        <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 15, paddingHorizontal: 13 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', paddingVertical: 12 }}>Detalle del gasto</Text>
          {movement.items.map((item, index) => (
            <View key={`${item.nombre}-${index}`} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f4efe4' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700' }}>{item.nombre}</Text>
                <Text style={{ fontSize: 11, color: '#6b665c', marginTop: 2 }}>{item.cantidad} × {item.costoUnitario}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700' }}>{item.subtotal}</Text>
            </View>
          ))}
          {!!movement.manoObra && <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#f4efe4' }}><Text style={{ fontSize: 13, fontWeight: '700' }}>Mano de obra</Text><Text style={{ fontSize: 13, fontWeight: '700' }}>{movement.manoObra}</Text></View>}
        </View>
      )}
    </BottomSheet>
  );
}

function Info({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: '#f7f3eb', borderRadius: 15, padding: 12 }}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#3d3a34', marginTop: 5 }} numberOfLines={multiline ? 4 : 1}>{value || 'Sin especificar'}</Text>
    </View>
  );
}

const labelStyle = { color: '#6b665c', fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.7, textTransform: 'uppercase' as const };
