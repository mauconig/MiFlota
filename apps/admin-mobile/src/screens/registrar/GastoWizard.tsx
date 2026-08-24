import { Pressable, Text, TextInput, View } from 'react-native';
import type { MobileView } from '../../useMobileView';
import { ChipRow } from '../../components/ChipRow';
import { FileDrop } from '../../components/FileDrop';
import { MoneyDisplay } from '../../components/MoneyDisplay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { RegistrarWizard } from '../../components/RegistrarWizard';
import { useDateField } from '../../components/DateField';
import { useSelectSheet } from '../../components/SelectSheet';
import { dLblFull } from '../../format';

type RegistrarView = NonNullable<MobileView['registrar']>;

const card = { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 14 } as const;

export function GastoWizard({ r }: { r: RegistrarView }) {
  const gasto = r.gasto;
  if (!gasto) return null;

  if (r.success) {
    return (
      <View style={{ gap: 18, paddingTop: 10 }}>
        <View style={{ backgroundColor: '#fdf0dd', borderRadius: 22, padding: 22, gap: 8 }}>
          <Text style={{ color: '#9a6a12', fontSize: 26, fontWeight: '800' }}>{r.success.title}</Text>
          <Text style={{ color: '#80642f', fontSize: 15 }}>{r.success.detail}</Text>
          <Text style={{ color: '#9a6a12', fontSize: 28, fontWeight: '800', marginTop: 8 }}>{r.success.amount}</Text>
        </View>
        <Pressable onPress={r.finish} style={{ minHeight: 52, borderRadius: 18, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fffdf8', fontSize: 15, fontWeight: '700' }}>Volver a Inicio</Text>
        </Pressable>
        <Pressable onPress={r.again} style={{ minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#5f5a51', fontSize: 15, fontWeight: '700' }}>Registrar otro egreso</Text>
        </Pressable>
      </View>
    );
  }

  const current = gasto.selCars.find((c) => c.id === gasto.carId);
  const select = useSelectSheet('Elegí un auto', gasto.selCars, gasto.setCarId);
  const fecha = useDateField(r.fecha, r.setFecha, r.hoy);

  let content: React.ReactNode;
  if (r.step === 0) {
    content = (
      <>
        <Pressable onPress={select.open} style={{ ...card, minHeight: 62, justifyContent: 'center' }}>
          <Text style={{ color: current ? '#16150f' : '#9b9386', fontSize: 16, fontWeight: '700' }}>{current?.label ?? 'Elegí un auto'}</Text>
        </Pressable>
        {select.sheet}
      </>
    );
  } else if (r.step === 1) {
    content = <ChipRow chips={gasto.catChips} wrap />;
  } else if (r.step === 2) {
    content = (
      <View style={card}>
        <TextInput autoFocus value={r.nota} onChangeText={r.setNota} placeholder="Ej. pastillas de freno" placeholderTextColor="#a39a8b" style={{ minHeight: 54, color: '#16150f', fontSize: 17 }} />
      </View>
    );
  } else if (r.step === 3) {
    content = (
      <>
        <MoneyDisplay display={r.amountDisplay} color={r.amountColor} hint="Total del egreso" />
        <NumericKeypad keys={r.keys} />
      </>
    );
  } else {
    content = (
      <View style={{ ...card, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: '#6b665c', fontSize: 13 }}>Auto</Text>
          <Text style={{ flex: 1, textAlign: 'right', color: '#16150f', fontSize: 14, fontWeight: '700' }}>{current?.label ?? '—'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: '#6b665c', fontSize: 13 }}>Tipo</Text>
          <Text style={{ color: '#16150f', fontSize: 14, fontWeight: '700' }}>{gasto.catChips.find((c) => c.bg === '#e8a13a' || c.bg === '#16150f')?.label ?? 'Egreso'}</Text>
        </View>
        {!!r.nota.trim() && <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: '#6b665c', fontSize: 13 }}>Detalle</Text><Text style={{ flex: 1, textAlign: 'right', color: '#16150f', fontSize: 14, fontWeight: '600' }}>{r.nota.trim()}</Text></View>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: '#6b665c', fontSize: 13 }}>Total</Text>
          <Text style={{ color: '#c0553f', fontSize: 19, fontWeight: '800' }}>{r.amountDisplay}</Text>
        </View>
        <Pressable onPress={fecha.open} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
          <Text style={{ color: '#6b665c', fontSize: 13 }}>Fecha</Text>
          <Text style={{ color: '#16150f', fontSize: 14, fontWeight: '600' }}>{dLblFull(new Date(r.fecha + 'T12:00:00'))}</Text>
        </Pressable>
        <FileDrop file={gasto.comprobante} onChange={gasto.setComprobante} />
        {fecha.picker}
      </View>
    );
  }

  return (
    <RegistrarWizard
      step={r.progressStep}
      totalSteps={r.totalSteps}
      title={r.stepTitle}
      hint={r.stepHint}
      onBack={r.backStep}
      onNext={r.step === 4 ? r.submit : r.next}
      nextLabel={r.step === 4 ? 'Registrar egreso' : 'Continuar'}
      nextDisabled={r.guardando}
    >
      {content}
    </RegistrarWizard>
  );
}
