import { Pressable, Text, View } from 'react-native';
import type { IngresosDetailView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';

/** La tabla de Ingresos agrupa por auto: esta hoja muestra los pagos de ese
 *  auto en el período y desde acá se abre el detalle de cada movimiento. */
export function IngresosDetailSheet({ detail }: { detail: IngresosDetailView | null }) {
  if (!detail) return null;

  return (
    <BottomSheet title={detail.title} onClose={detail.close}>
      {!!detail.subtitle && <Text style={{ color: '#6b665c', fontSize: 12, marginTop: -4 }}>{detail.subtitle}</Text>}
      {detail.rows.length === 0 ? (
        <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 16, padding: 18 }}>
          <Text style={{ color: '#6b665c', fontSize: 13 }}>No hay ingresos de este auto en el período.</Text>
        </View>
      ) : (
        detail.rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={row.open}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${row.tipo} de ${row.date}`}
            style={{ borderWidth: 1, borderColor: '#e6ded0', backgroundColor: '#fffdf8', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#1a1a18', fontSize: 13, fontWeight: '700' }}>{row.date}</Text>
              <Text style={{ color: '#6b665c', fontSize: 11, marginTop: 2 }}>{row.tipo} · {row.medio}</Text>
            </View>
            <Text style={{ color: '#256b4d', fontSize: 14, fontWeight: '800' }}>{row.amount}</Text>
            <Text style={{ color: '#b5791a', fontSize: 18 }}>›</Text>
          </Pressable>
        ))
      )}
    </BottomSheet>
  );
}
