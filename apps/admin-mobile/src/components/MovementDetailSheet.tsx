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
      <Info label="Sección" value={movement.section} />
      <Info label="GPS tag" value={movement.gpsTag} />
      {!!movement.note && <Info label="Detalle" value={movement.note} multiline />}

      {movement.comprobante && <ComprobantePreview source={movement.comprobante} />}
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
