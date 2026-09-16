import { Pressable, ScrollView, Text, View } from 'react-native';
import type { MobileView } from '../useMobileView';

const PAPER = '#fffdf8';
const BORDER = '#ece4d6';
const INK = '#16150f';
const MUTED = '#6b665c';
const SOFT = '#f4f0e8';

function previewMoney(value: number) {
  return `Gs. ${new Intl.NumberFormat('es-PY').format(Math.round(value))}`;
}

/** Listado completo de los movimientos que se van a exportar. Cada tarjeta abre
 *  el detalle del movimiento, igual que en la pantalla de Gastos. La lista no se
 *  pagina a propósito: es una vista de control, no una tabla de trabajo. */
export function ReportePreview({ v }: { v: MobileView }) {
  const rows = v.reportes.previewRows;

  return (
    <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 10 }}>
      <View style={{ gap: 3 }}>
        <Text style={{ color: INK, fontSize: 20, fontWeight: '800' }}>{rows.length} {rows.length === 1 ? 'movimiento' : 'movimientos'}</Text>
        <Text style={{ color: MUTED, fontSize: 12 }}>{v.reportes.periodLabel}</Text>
      </View>

      {rows.length === 0 ? (
        <View style={{ backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 20 }}>
          <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center' }}>No hay movimientos para esta selección.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {rows.map((row) => (
            <Pressable key={row.id} onPress={row.open} accessibilityRole="button" accessibilityLabel={`Ver ${row.tipo.toLowerCase()} de ${row.vehiculo}`} style={{ backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 15, padding: 13, gap: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <Text style={{ color: row.tipo === 'Ingreso' ? '#256b4d' : '#a65b27', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{row.tipo}</Text>
                <Text style={{ color: INK, fontSize: 14, fontWeight: '800' }}>{previewMoney(row.monto)}</Text>
              </View>
              <Text style={{ color: MUTED, fontSize: 12 }}>{row.fecha} · {row.vehiculo}</Text>
              <Text style={{ color: INK, fontSize: 14, fontWeight: '700' }}>{row.detalle}</Text>
              <Text style={{ color: MUTED, fontSize: 12 }}>{row.tipo === 'Ingreso' ? `Chofer: ${row.chofer} · Medio: ${row.medio}` : `Categoría: ${row.categoria}`}</Text>
              {!!row.nota && <Text style={{ color: MUTED, fontSize: 12 }}>Nota: {row.nota}</Text>}
              {!!row.items.length && <View style={{ backgroundColor: SOFT, borderRadius: 10, padding: 9, gap: 3 }}>
                <Text style={{ color: MUTED, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Repuestos</Text>
                {row.items.map((item, index) => <Text key={`${row.id}-item-${index}`} style={{ color: INK, fontSize: 11 }}>{item.cantidad} x {item.nombre} · {previewMoney(item.costoUnitario)} c/u · {previewMoney(item.subtotal)}</Text>)}
              </View>}
              {!!row.manoObra && <Text style={{ color: MUTED, fontSize: 12 }}>Mano de obra: {previewMoney(row.manoObra)}</Text>}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
