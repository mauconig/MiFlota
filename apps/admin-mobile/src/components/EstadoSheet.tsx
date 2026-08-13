import { Pressable, Text, TextInput, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { BottomSheet } from './BottomSheet';
import { FileDrop } from './FileDrop';

export function EstadoSheet({ v }: { v: MobileView }) {
  const s = v.estadoSheet;
  const t = s.taller;

  if (t) {
    return (
      <BottomSheet title={'Taller · ' + t.plate} onClose={t.cancelar}>
        <Text style={{ fontSize: 12, color: '#6b665c' }}>Mandar un auto a taller registra el gasto en el mismo paso.</Text>
        <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 18, paddingHorizontal: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4efe4' }}>
            <Text style={{ width: 90, fontSize: 13, fontWeight: '600' }}>Motivo</Text>
            <TextInput value={t.razon} onChangeText={t.setRazon} placeholder="Frenos, service, chapa…" style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: 0 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
            <Text style={{ width: 90, fontSize: 13, fontWeight: '600' }}>Gasto</Text>
            <TextInput
              keyboardType="numeric"
              value={t.monto}
              onChangeText={t.setMonto}
              placeholder="350.000"
              style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: 0 }}
            />
          </View>
        </View>
        <FileDrop file={t.comprobante} onChange={t.setComprobante} />
        <Pressable
          onPress={t.guardar}
          disabled={t.guardando}
          style={{ borderRadius: 18, backgroundColor: '#16150f', minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: t.guardando ? 0.7 : 1 }}
        >
          <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>{t.guardando ? 'Guardando…' : 'Mandar a taller'}</Text>
        </Pressable>
        <Pressable onPress={t.cancelar} style={{ borderWidth: 1, borderColor: '#e0d6c4', borderRadius: 18, backgroundColor: '#fffdf8', minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#3d3a34', fontSize: 13, fontWeight: '600' }}>Cancelar</Text>
        </Pressable>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet title="Estado del vehículo" onClose={s.close}>
      {s.opts.map((op, i) => (
        <Pressable key={i} onPress={op.pick} style={{ borderWidth: 1, borderColor: op.bd, backgroundColor: op.bg, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 16, gap: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: op.fg }}>{op.label}</Text>
          <Text style={{ fontSize: 11, color: op.subFg }}>{op.sub}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
}
