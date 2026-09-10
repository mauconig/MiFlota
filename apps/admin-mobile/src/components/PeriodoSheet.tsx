import { Pressable, Text } from 'react-native';
import type { MobileView } from '../useMobileView';
import { ChipRow } from './ChipRow';
import { BottomSheet } from './BottomSheet';
import { DateRangeInputs } from './DateRangeInputs';

export function PeriodoSheet({ v }: { v: MobileView }) {
  const p = v.period;
  const applyAndClose = () => {
    if (p.applyTextRange()) p.closeSheet();
  };
  return (
    <BottomSheet title="Período" onClose={applyAndClose}>
      <ChipRow chips={p.chips} wrap />
      <DateRangeInputs fromText={p.fromText} toText={p.toText} error={p.error} onFromChange={p.setFromText} onToChange={p.setToText} />
      <Pressable onPress={applyAndClose} style={{ borderRadius: 18, backgroundColor: '#16150f', minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
        <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Aplicar</Text>
      </Pressable>
    </BottomSheet>
  );
}
