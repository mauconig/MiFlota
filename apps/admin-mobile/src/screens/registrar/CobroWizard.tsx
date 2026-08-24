import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { MobileView } from '../../useMobileView';
import { MoneyDisplay } from '../../components/MoneyDisplay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { RegistrarWizard } from '../../components/RegistrarWizard';
import { useDateField } from '../../components/DateField';
import { useSelectSheet } from '../../components/SelectSheet';
import { dLblFull } from '../../format';

type RegistrarView = NonNullable<MobileView['registrar']>;

const card = { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 14 } as const;

export function CobroSuccess({ r }: { r: RegistrarView }) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  if (!r.success) return null;
  return (
    <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 12 }}>
      <View style={{ backgroundColor: '#e7f2ec', borderRadius: 18, padding: compact ? 16 : 18, gap: 6 }}>
        <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#256b4d', fontSize: compact ? 21 : 23, lineHeight: compact ? 26 : 28, fontWeight: '800' }}>{r.success.title}</Text>
        <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#4f6b5b', fontSize: 14, lineHeight: 19 }}>{r.success.detail}</Text>
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: '#256b4d', fontSize: compact ? 24 : 26, fontWeight: '800', marginTop: 6 }}>{r.success.amount}</Text>
      </View>
      <Pressable onPress={r.finish} style={{ minHeight: 48, borderRadius: 15, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}><Text allowFontScaling={false} style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Volver a Inicio</Text></Pressable>
      <Pressable onPress={r.again} style={{ minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }}><Text allowFontScaling={false} style={{ color: '#5f5a51', fontSize: 14, fontWeight: '700' }}>Registrar otro ingreso</Text></Pressable>
    </View>
  );
}

export function CobroWizard({ r }: { r: RegistrarView }) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const cobro = r.cobro;
  const fecha = useDateField(r.fecha, r.setFecha, r.hoy);
  if (!cobro) return null;

  if (r.success) {
    return (
      <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'flex-start', gap: 12, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 12 }}>
        <View style={{ backgroundColor: '#e7f2ec', borderRadius: 18, padding: compact ? 16 : 18, gap: 6 }}>
          <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#256b4d', fontSize: compact ? 21 : 23, lineHeight: compact ? 26 : 28, fontWeight: '800' }}>{r.success.title}</Text>
          <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#4f6b5b', fontSize: 14, lineHeight: 19 }}>{r.success.detail}</Text>
          <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: '#256b4d', fontSize: compact ? 24 : 26, fontWeight: '800', marginTop: 6 }}>{r.success.amount}</Text>
        </View>
        <Pressable onPress={r.finish} style={{ minHeight: 48, borderRadius: 15, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}>
          <Text allowFontScaling={false} style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Volver a Inicio</Text>
        </Pressable>
        <Pressable onPress={r.again} style={{ minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }}>
          <Text allowFontScaling={false} style={{ color: '#5f5a51', fontSize: 14, fontWeight: '700' }}>Registrar otro ingreso</Text>
        </Pressable>
      </View>
    );
  }

  const current = cobro.selCars.find((c) => c.id === cobro.carId);
  const select = useSelectSheet('Elegí un auto', cobro.selCars, cobro.setCarId);
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
    content = (
      <>
        <MoneyDisplay display={r.amountDisplay} color={r.amountColor} hint="Ingreso recibido" />
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
          <Text style={{ color: '#6b665c', fontSize: 13 }}>Monto</Text>
          <Text style={{ flex: 1, textAlign: 'right', color: '#256b4d', fontSize: 19, fontWeight: '800' }}>{r.amountDisplay}</Text>
        </View>
        <Pressable onPress={fecha.open} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
          <Text style={{ color: '#6b665c', fontSize: 13 }}>Fecha</Text>
          <Text style={{ color: '#16150f', fontSize: 14, fontWeight: '600' }}>{dLblFull(new Date(r.fecha + 'T12:00:00'))}</Text>
        </Pressable>
        <TextInput value={r.nota} onChangeText={r.setNota} placeholder="Nota opcional" placeholderTextColor="#a39a8b" style={{ borderTopWidth: 1, borderTopColor: '#f0e9de', paddingTop: 13, color: '#16150f', fontSize: 14 }} />
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
      onNext={r.step === 2 ? r.submit : r.next}
      nextLabel={r.step === 2 ? 'Registrar ingreso' : 'Continuar'}
      nextDisabled={r.guardando}
    >
      {content}
    </RegistrarWizard>
  );
}
