import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { MobileView } from '../../useMobileView';
import { FileDrop } from '../../components/FileDrop';
import { MoneyDisplay } from '../../components/MoneyDisplay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { RegistrarWizard } from '../../components/RegistrarWizard';
import { useDateField } from '../../components/DateField';
import { useSelectSheet } from '../../components/SelectSheet';
import { dLblFull } from '../../format';

type RegistrarView = NonNullable<MobileView['registrar']>;
const card = { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 14 } as const;

export function ServiceSuccess({ r }: { r: RegistrarView }) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  if (!r.success) return null;
  return (
    <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 12 }}>
      <View style={{ backgroundColor: '#eef0f8', borderRadius: 18, padding: compact ? 16 : 18, gap: 6 }}>
        <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#4d587e', fontSize: compact ? 21 : 23, lineHeight: compact ? 26 : 28, fontWeight: '800' }}>{r.success.title}</Text>
        <Text allowFontScaling={false} numberOfLines={2} style={{ color: '#626b8d', fontSize: 14, lineHeight: 19 }}>{r.success.detail}</Text>
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: '#4d587e', fontSize: compact ? 24 : 26, fontWeight: '800', marginTop: 6 }}>{r.success.amount}</Text>
      </View>
      <Pressable onPress={r.finish} style={{ minHeight: 48, borderRadius: 15, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}>
        <Text allowFontScaling={false} style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>Volver a Inicio</Text>
      </Pressable>
      <Pressable onPress={r.again} style={{ minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }}>
        <Text allowFontScaling={false} style={{ color: '#5f5a51', fontSize: 14, fontWeight: '700' }}>Registrar otro service</Text>
      </Pressable>
    </View>
  );
}

export function ServiceWizard({ r }: { r: RegistrarView }) {
  const service = r.service;
  const current = service?.selCars.find((car) => car.id === service.carId);
  const select = useSelectSheet('Elegí un auto', service?.selCars ?? [], service?.setCarId ?? (() => {}));
  const fecha = useDateField(r.fecha, r.setFecha, r.hoy);
  if (!service) return null;

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
      <View style={{ ...card, gap: 8 }}>
        <TextInput value={r.nota} onChangeText={r.setNota} placeholder="Ej.: cambio de aceite y filtros" placeholderTextColor="#a39a8b" multiline maxLength={200} autoFocus style={{ minHeight: 100, color: '#16150f', fontSize: 17, textAlignVertical: 'top' }} />
      </View>
    );
  } else if (r.step === 2) {
    content = <><MoneyDisplay display={r.amountDisplay} color={r.amountColor} hint="Opcional · si lo completás, también aparece en Gastos" /><NumericKeypad keys={r.keys} /></>;
  } else if (r.step === 3) {
    content = (
      <Pressable onPress={fecha.open} style={{ ...card, minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#6b665c', fontSize: 14 }}>Fecha del service</Text>
        <Text style={{ color: '#16150f', fontSize: 15, fontWeight: '700' }}>{dLblFull(new Date(r.fecha + 'T12:00:00'))}</Text>
      </Pressable>
    );
  } else if (r.step === 4) {
    content = (
      <View style={{ ...card, gap: 8 }}>
        <Text style={{ color: '#6b665c', fontSize: 13 }}>Kilometraje al hacer el service</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput value={service.kilometraje} onChangeText={service.setKilometraje} placeholder="Opcional" placeholderTextColor="#a39a8b" keyboardType="numeric" style={{ flex: 1, color: '#16150f', fontSize: 22, fontWeight: '700', paddingVertical: 8 }} />
          <Text style={{ color: '#6b665c', fontSize: 15 }}>km</Text>
        </View>
      </View>
    );
  } else {
    content = (
      <View style={{ ...card, gap: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: '#6b665c', fontSize: 13 }}>Auto</Text><Text style={{ flex: 1, textAlign: 'right', color: '#16150f', fontSize: 14, fontWeight: '700' }}>{current?.label ?? '—'}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: '#6b665c', fontSize: 13 }}>Trabajo</Text><Text style={{ flex: 1, textAlign: 'right', color: '#16150f', fontSize: 14, fontWeight: '700' }} numberOfLines={2}>{r.nota}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: '#6b665c', fontSize: 13 }}>Costo</Text><Text style={{ color: '#4d587e', fontSize: 18, fontWeight: '800' }}>{service.tieneCosto ? r.amountDisplay : 'Sin costo'}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: '#6b665c', fontSize: 13 }}>Fecha</Text><Text style={{ color: '#16150f', fontSize: 14, fontWeight: '600' }}>{dLblFull(new Date(r.fecha + 'T12:00:00'))}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: '#6b665c', fontSize: 13 }}>Kilometraje</Text><Text style={{ color: '#16150f', fontSize: 14, fontWeight: '600' }}>{service.kilometraje ? `${service.kilometraje} km` : 'Sin informar'}</Text></View>
        <FileDrop file={service.comprobante} onChange={service.setComprobante} />
      </View>
    );
  }

  return (
    <RegistrarWizard step={r.progressStep} totalSteps={r.totalSteps} title={r.stepTitle} hint={r.stepHint} onBack={r.backStep} onNext={r.step === 5 ? r.submit : r.next} nextLabel={r.step === 5 ? 'Registrar service' : 'Continuar'} nextDisabled={r.guardando}>
      {content}
      {fecha.picker}
    </RegistrarWizard>
  );
}
