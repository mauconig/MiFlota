import { Pressable, Text, View } from 'react-native';
import type { MobileView } from '../useMobileView';
import { ChipRow } from './ChipRow';
import { BottomSheet } from './BottomSheet';
import { useDateField } from './DateField';
import { dLblFull } from '../format';

export function PeriodoSheet({ v }: { v: MobileView }) {
  const p = v.period;
  const from = useDateField(p.cFrom, p.setFrom);
  const to = useDateField(p.cTo, p.setTo);
  return (
    <BottomSheet title="Período" onClose={p.closeSheet}>
      <ChipRow chips={p.chips} wrap />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c' }}>Desde</Text>
          <Pressable onPress={from.open} style={{ borderWidth: 1, borderColor: '#e6ded0', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, backgroundColor: '#fffdf8' }}>
            <Text style={{ fontSize: 13, color: '#1a1a18' }}>{dLblFull(new Date(p.cFrom + 'T12:00:00'))}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6b665c' }}>Hasta</Text>
          <Pressable onPress={to.open} style={{ borderWidth: 1, borderColor: '#e6ded0', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, backgroundColor: '#fffdf8' }}>
            <Text style={{ fontSize: 13, color: '#1a1a18' }}>{dLblFull(new Date(p.cTo + 'T12:00:00'))}</Text>
          </Pressable>
        </View>
      </View>
      {from.picker}
      {to.picker}
      <Pressable onPress={p.closeSheet} style={{ borderRadius: 18, backgroundColor: '#16150f', minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
        <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Aplicar</Text>
      </Pressable>
    </BottomSheet>
  );
}
