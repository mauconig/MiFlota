import { Pressable, Text, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { ChipRow } from '../components/ChipRow';

const card = { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 16 } as const;

export function Gastos({ v }: { v: MobileView }) {
  const g = v.gastos;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 12 }}>
      <Pressable onPress={v.period.openSheet} style={{ ...card, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View><Text style={{ fontSize: 10, fontWeight: '700', color: '#6b665c', textTransform: 'uppercase', letterSpacing: 1 }}>Período</Text><Text style={{ fontSize: 14, fontWeight: '700', marginTop: 3 }}>{v.period.label}</Text></View>
        <Text style={{ color: '#b5791a', fontWeight: '700' }}>Cambiar</Text>
      </Pressable>

      <View style={card}>
        <Text style={{ fontSize: 13, fontWeight: '700', marginBottom: 9 }}>Vehículo</Text>
        <ChipRow chips={g.carFilters} />
        <Text style={{ fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 9 }}>Categoría</Text>
        <ChipRow chips={g.catFilters} wrap />
      </View>

      {g.empty ? (
        <View style={{ ...card, alignItems: 'center', paddingVertical: 30, gap: 10 }}>
          <Text style={{ fontSize: 17, fontWeight: '700' }}>No hay gastos en este período</Text>
          <Text style={{ color: '#6b665c', textAlign: 'center', fontSize: 13 }}>Cuando cargues un gasto, lo vas a ver agrupado por vehículo.</Text>
          <Pressable onPress={v.registroChoice.gasto} style={{ minHeight: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fffdf8', fontWeight: '700' }}>Registrar gasto</Text></Pressable>
        </View>
      ) : g.groups.map((group) => (
        <View key={group.carId} style={card}>
          <Pressable onPress={group.toggle} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View><Text style={{ fontSize: 16, fontWeight: '800' }}>{group.plate}</Text><Text style={{ color: '#6b665c', fontSize: 12, marginTop: 2 }}>{group.rows.length} gasto{group.rows.length === 1 ? '' : 's'}</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={{ fontSize: 16, fontWeight: '800', color: '#c0553f' }}>{group.total}</Text><Text style={{ color: '#6b665c', fontSize: 11 }}>{group.expanded ? 'Ocultar' : 'Ver gastos'}</Text></View>
          </Pressable>
          {group.expanded && group.rows.map((row) => (
            <View key={row.id} style={{ borderTopWidth: 1, borderTopColor: '#f0ebe0', paddingTop: 10, marginTop: 6 }}>
              <Pressable onPress={row.toggle} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: '700' }}>{row.desc}</Text><Text style={{ fontSize: 11, color: '#6b665c', marginTop: 3 }}>{row.cat} · {row.date}</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={{ fontWeight: '800', color: '#c0553f' }}>{row.amount}</Text><Text style={{ fontSize: 11, color: '#b5791a' }}>{row.expanded ? 'Ocultar' : 'Detalle'}</Text></View>
              </Pressable>
              {row.expanded && <View style={{ backgroundColor: '#faf7f0', borderRadius: 13, padding: 11, gap: 6 }}>
                {row.items.length === 0 ? <Text style={{ fontSize: 12, color: '#6b665c' }}>Sin repuestos detallados</Text> : row.items.map((item, i) => <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ flex: 1, fontSize: 12 }}>{item.cantidad} × {item.nombre}</Text><Text style={{ fontSize: 12, color: '#6b665c' }}>{item.costoUnitario} c/u</Text><Text style={{ fontSize: 12, fontWeight: '700' }}>{item.subtotal}</Text></View>)}
                {row.items.length > 0 && <View style={{ borderTopWidth: 1, borderTopColor: '#e8dfd0', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 12, color: '#6b665c' }}>Repuestos</Text><Text style={{ fontSize: 12, fontWeight: '700' }}>{row.repuestos}</Text></View>}
                {!!row.manoObra && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 12, color: '#6b665c' }}>Mano de obra</Text><Text style={{ fontSize: 12, fontWeight: '700' }}>{row.manoObra}</Text></View>}
              </View>}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
