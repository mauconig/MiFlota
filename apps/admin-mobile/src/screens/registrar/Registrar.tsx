import { Pressable, Text, TextInput, View } from 'react-native';
import type { MobileView } from '../../useMobileView';
import { MoneyDisplay } from '../../components/MoneyDisplay';
import { useDateField } from '../../components/DateField';
import { dLblFull } from '../../format';
import { GastoTab } from './GastoTab';
import { CobroWizard } from './CobroWizard';

export function Registrar({ v }: { v: MobileView }) {
  const r = v.registrar;
  const fecha = useDateField(r?.fecha ?? '', r?.setFecha ?? (() => {}), r?.hoy);
  if (!r) return null;
  if (r.tab === 'cobro') return <CobroWizard r={r} />;
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14, gap: 12 }}>
      <MoneyDisplay display={r.amountDisplay} color={r.amountColor} hint={r.amountHint} />

      {r.gasto && <GastoTab r={r.gasto} />}

      <View style={{ backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, paddingHorizontal: 14 }}>
        <Pressable onPress={fecha.open} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f4efe4' }}>
          <Text style={{ width: 70, fontSize: 13, fontWeight: '600' }}>Fecha</Text>
          <Text style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#3d3a34' }}>{dLblFull(new Date(r.fecha + 'T12:00:00'))}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }}>
          <Text style={{ width: 70, fontSize: 13, fontWeight: '600' }}>Nota</Text>
          <TextInput placeholder={r.notaPh} value={r.nota} onChangeText={r.setNota} style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: 0 }} />
        </View>
      </View>
      {fecha.picker}

      <Pressable onPress={r.submit} disabled={r.guardando} style={{ borderRadius: 20, backgroundColor: r.cta.bg, minHeight: 52, alignItems: 'center', justifyContent: 'center', opacity: r.guardando ? 0.7 : 1 }}>
        <Text style={{ color: r.cta.fg, fontSize: 15, fontWeight: '700' }}>{r.guardando ? 'Guardando…' : r.cta.label}</Text>
      </Pressable>
    </View>
  );
}
