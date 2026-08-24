import { Pressable, Text, TextInput, View } from 'react-native';
import type { MobileView } from '../../useMobileView';
import { ChipRow } from '../../components/ChipRow';
import { MoneyDisplay } from '../../components/MoneyDisplay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { RegistrarWizard } from '../../components/RegistrarWizard';
import { useDateField } from '../../components/DateField';
import { useSelectSheet } from '../../components/SelectSheet';
import { dLblFull } from '../../format';

type RegistrarView = NonNullable<MobileView['registrar']>;
type CobroView = NonNullable<RegistrarView['cobro']>;

const card = { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 14 } as const;

function Review({ r, cobro }: { r: RegistrarView; cobro: CobroView }) {
  const current = cobro.opciones.find((o) => o.id === cobro.driver);
  return (
    <View style={{ ...card, gap: 13 }}>
      <Row label="Chofer" value={current?.label ?? 'Sin elegir'} />
      <Row label="Monto" value={r.amountDisplay} strong />
      <Row label="Tipo" value={r.tab === 'cobro' ? (cobro.tipoOpts.find((o) => o.bg === '#16150f')?.label ?? 'Pago') : ''} />
      <Row label="Fecha" value={dLblFull(new Date(r.fecha + 'T12:00:00'))} />
      <Row label="Nota" value={r.nota.trim() || 'Sin nota'} />
    </View>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: '#6b665c', fontSize: 13 }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: 'right', color: '#16150f', fontSize: 14, fontWeight: strong ? '800' : '600' }} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export function CobroWizard({ r }: { r: RegistrarView }) {
  const cobro = r.cobro;
  if (!cobro) return null;

  if (r.success) {
    return (
      <View style={{ gap: 18, paddingTop: 10 }}>
        <View style={{ backgroundColor: '#e7f2ec', borderRadius: 22, padding: 22, gap: 8 }}>
          <Text style={{ color: '#256b4d', fontSize: 26, fontWeight: '800' }}>{r.success.title}</Text>
          <Text style={{ color: '#4f6b5b', fontSize: 15 }}>{r.success.detail}</Text>
          <Text style={{ color: '#256b4d', fontSize: 28, fontWeight: '800', marginTop: 8 }}>{r.success.amount}</Text>
        </View>
        <Pressable onPress={r.finish} style={{ minHeight: 52, borderRadius: 18, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fffdf8', fontSize: 15, fontWeight: '700' }}>Volver a Inicio</Text>
        </Pressable>
        <Pressable onPress={r.again} style={{ minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#5f5a51', fontSize: 15, fontWeight: '700' }}>Registrar otro cobro</Text>
        </Pressable>
      </View>
    );
  }

  const current = cobro.opciones.find((o) => o.id === cobro.driver);
  const select = useSelectSheet('Elegí un chofer', cobro.opciones, cobro.setDriver);
  const fecha = useDateField(r.fecha, r.setFecha, r.hoy);

  let content: React.ReactNode;
  if (r.step === 0) {
    content = (
      <>
        <Pressable onPress={select.open} style={{ ...card, minHeight: 62, justifyContent: 'center' }}>
          <Text style={{ color: current ? '#16150f' : '#9b9386', fontSize: 16, fontWeight: '700' }}>{current?.label ?? 'Elegí un chofer'}</Text>
        </Pressable>
        {select.sheet}
      </>
    );
  } else if (r.step === 1) {
    content = (
      <>
        <MoneyDisplay display={r.amountDisplay} color={r.amountColor} hint="Pago recibido" />
        <NumericKeypad keys={r.keys} />
      </>
    );
  } else if (r.step === 2) {
    content = <ChipRow chips={cobro.tipoOpts} equal />;
  } else if (r.step === 3) {
    content = (
      <>
        <Pressable onPress={fecha.open} style={{ ...card, minHeight: 62, justifyContent: 'center' }}>
          <Text style={{ color: '#16150f', fontSize: 17, fontWeight: '700' }}>{dLblFull(new Date(r.fecha + 'T12:00:00'))}</Text>
        </Pressable>
        {fecha.picker}
      </>
    );
  } else if (r.step === 4) {
    content = (
      <View style={card}>
        <TextInput autoFocus value={r.nota} onChangeText={r.setNota} placeholder="Ej. pago de esta semana" placeholderTextColor="#a39a8b" multiline style={{ minHeight: 80, color: '#16150f', fontSize: 16, textAlignVertical: 'top' }} />
      </View>
    );
  } else {
    content = <Review r={r} cobro={cobro} />;
  }

  return (
    <RegistrarWizard
      step={r.step}
      totalSteps={r.totalSteps}
      title={r.stepTitle}
      hint={r.stepHint}
      onBack={r.backStep}
      onNext={r.step === 5 ? r.submit : r.next}
      nextLabel={r.nextLabel}
      nextDisabled={r.guardando}
    >
      {content}
    </RegistrarWizard>
  );
}
