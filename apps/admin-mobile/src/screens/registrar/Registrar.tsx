import { Pressable, Text, TextInput, View } from 'react-native';
import type { MobileView } from '../../useMobileView';
import { MoneyDisplay } from '../../components/MoneyDisplay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { useDateField } from '../../components/DateField';
import { dLblFull } from '../../format';
import { CobroTab } from './CobroTab';
import { GastoTab } from './GastoTab';

export function Registrar({ v }: { v: MobileView }) {
  const r = v.registrar;
  const fecha = useDateField(r?.fecha ?? '', r?.setFecha ?? (() => {}), r?.hoy);
  if (!r) return null;
  const segBg = (on: boolean) => (on ? '#16150f' : 'transparent');
  const segFg = (on: boolean) => (on ? '#fffdf8' : '#6b665c');
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#e6ded0', borderRadius: 24, padding: 4, gap: 2 }}>
        <Pressable onPress={() => r.setTab('cobro')} style={{ flex: 1, borderRadius: 20, paddingVertical: 9, alignItems: 'center', backgroundColor: segBg(r.tab === 'cobro') }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: segFg(r.tab === 'cobro') }}>Cobro</Text>
        </Pressable>
        <Pressable onPress={() => r.setTab('gasto')} style={{ flex: 1, borderRadius: 20, paddingVertical: 9, alignItems: 'center', backgroundColor: segBg(r.tab === 'gasto') }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: segFg(r.tab === 'gasto') }}>Gasto</Text>
        </Pressable>
      </View>

      <MoneyDisplay display={r.amountDisplay} color={r.amountColor} hint={r.amountHint} />

      {r.tab === 'cobro' && r.cobro && <CobroTab r={r.cobro} />}
      {r.tab === 'gasto' && r.gasto && <GastoTab r={r.gasto} />}

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

      <NumericKeypad keys={r.keys} />

      <Pressable onPress={r.submit} disabled={r.guardando} style={{ borderRadius: 20, backgroundColor: r.cta.bg, minHeight: 52, alignItems: 'center', justifyContent: 'center', opacity: r.guardando ? 0.7 : 1 }}>
        <Text style={{ color: r.cta.fg, fontSize: 15, fontWeight: '700' }}>{r.guardando ? 'Guardando…' : r.cta.label}</Text>
      </Pressable>
    </View>
  );
}
