import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
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

export function GastoSuccess({ r }: { r: RegistrarView }) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  if (!r.success) return null;
  return (
    <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 12 }}>
      <View style={{ backgroundColor: '#fdf0dd', borderRadius: 18, padding: compact ? 16 : 18, gap: 6 }}>
        <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#9a6a12', fontSize: compact ? 21 : 23, lineHeight: compact ? 26 : 28, fontWeight: '800' }}>{r.success.title}</Text>
        <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#80642f', fontSize: 14, lineHeight: 19 }}>{r.success.detail}</Text>
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: '#9a6a12', fontSize: compact ? 24 : 26, fontWeight: '800', marginTop: 6 }}>{r.success.amount}</Text>
      </View>
      <Pressable onPress={r.finish} style={{ minHeight: 48, borderRadius: 15, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}><Text allowFontScaling={false} style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Volver a Inicio</Text></Pressable>
      <Pressable onPress={r.again} style={{ minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }}><Text allowFontScaling={false} style={{ color: '#5f5a51', fontSize: 14, fontWeight: '700' }}>Registrar otro egreso</Text></Pressable>
    </View>
  );
}

export function GastoWizard({ r }: { r: RegistrarView }) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const gasto = r.gasto;
  const current = gasto?.selCars.find((c) => c.id === gasto.carId);
  const select = useSelectSheet('ElegÃ­ un auto', gasto?.selCars ?? [], gasto?.setCarId ?? (() => {}));
  const fecha = useDateField(r.fecha, r.setFecha, r.hoy);
  void current;
  void select;
  if (!gasto) return null;

  if (r.success) {
    return (
      <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'flex-start', gap: 12, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 12 }}>
        <View style={{ backgroundColor: '#fdf0dd', borderRadius: 18, padding: compact ? 16 : 18, gap: 6 }}>
          <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#9a6a12', fontSize: compact ? 21 : 23, lineHeight: compact ? 26 : 28, fontWeight: '800' }}>{r.success.title}</Text>
          <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#80642f', fontSize: 14, lineHeight: 19 }}>{r.success.detail}</Text>
          <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: '#9a6a12', fontSize: compact ? 24 : 26, fontWeight: '800', marginTop: 6 }}>{r.success.amount}</Text>
        </View>
        <Pressable onPress={r.finish} style={{ minHeight: 48, borderRadius: 15, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}>
          <Text allowFontScaling={false} style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Volver a Inicio</Text>
        </Pressable>
        <Pressable onPress={r.again} style={{ minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }}>
          <Text allowFontScaling={false} style={{ color: '#5f5a51', fontSize: 14, fontWeight: '700' }}>Registrar otro egreso</Text>
        </Pressable>
      </View>
    );
  }

  {
  const current = gasto.selCars.find((c) => c.id === gasto.carId);
  const select = useSelectSheet('Elegí un auto', gasto.selCars, gasto.setCarId);
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
        <View style={{ gap: 7 }}>
          <Text style={{ color: '#6b665c', fontSize: 13, fontWeight: '700' }}>Nota (opcional)</Text>
          <TextInput value={r.nota} onChangeText={r.setNota} placeholder={r.notaPh} placeholderTextColor="#a39a8b" multiline maxLength={200} style={{ minHeight: 52, borderWidth: 1, borderColor: '#ece4d6', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, color: '#16150f', fontSize: 15, textAlignVertical: 'top' }} />
        </View>
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
      onNext={r.step === 3 ? r.submit : r.next}
      nextLabel={r.step === 3 ? 'Registrar egreso' : 'Continuar'}
      nextDisabled={r.guardando}
    >
      {content}
    </RegistrarWizard>
  );
  }
}
