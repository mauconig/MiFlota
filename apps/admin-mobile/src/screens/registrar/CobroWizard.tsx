import { useState } from 'react';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { MobileView } from '../../useMobileView';
import { BottomSheet } from '../../components/BottomSheet';
import { FileDrop } from '../../components/FileDrop';
import { MoneyDisplay } from '../../components/MoneyDisplay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { RegistrarWizard } from '../../components/RegistrarWizard';
import { useDateField } from '../../components/DateField';
import { useSelectSheet } from '../../components/SelectSheet';
import { dLblFull } from '../../format';

type RegistrarView = NonNullable<MobileView['registrar']>;
type CobroView = NonNullable<RegistrarView['cobro']>;

const card = { backgroundColor: '#fffdf8', borderWidth: 1, borderColor: '#ece4d6', borderRadius: 20, padding: 14 } as const;
const rowStyle = { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 12 };
const labelStyle = { color: '#6b665c', fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.7, textTransform: 'uppercase' as const };

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
  const cobro = r.cobro;
  const fecha = useDateField(r.fecha, r.setFecha, r.hoy);
  const [nuevoChofer, setNuevoChofer] = useState(false);
  const [nuevoAuto, setNuevoAuto] = useState(false);

  // Las hojas se montan siempre (los hooks no pueden quedar detrás de un
  // return condicional); si no hay cobro no se dibujan.
  const carSelect = useSelectSheet('Elegí un auto', cobro?.selCars ?? [], (id) => cobro?.setCarId(id), {
    label: 'Agregar auto nuevo',
    onPress: () => setNuevoAuto(true),
  });
  const driverSelect = useSelectSheet('Elegí un chofer', cobro?.opciones ?? [], (id) => cobro?.setDriver(id), {
    label: 'Crear chofer nuevo',
    onPress: () => setNuevoChofer(true),
  });

  if (!cobro) return null;

  if (r.success) {
    return <CobroSuccess r={r} />;
  }

  const currentCar = cobro.selCars.find((c) => c.id === cobro.carId);
  const esUltimo = r.step >= 3;

  let content: React.ReactNode;
  if (r.step === 0) {
    content = (
      <>
        <Pressable onPress={carSelect.open} style={{ ...card, minHeight: 66, justifyContent: 'center', gap: 4 }} accessibilityRole="button" accessibilityLabel="Elegir auto">
          <Text style={labelStyle}>Auto</Text>
          <Text style={{ color: currentCar ? '#16150f' : '#9b9386', fontSize: 16, fontWeight: '700' }} numberOfLines={2}>{currentCar?.label ?? 'Elegí un auto'}</Text>
        </Pressable>
        <Pressable onPress={() => setNuevoAuto(true)} style={{ minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button">
          <Text style={{ color: '#5f5a51', fontSize: 13, fontWeight: '700' }}>+ Agregar auto nuevo</Text>
        </Pressable>
        {carSelect.sheet}
      </>
    );
  } else if (r.step === 1) {
    content = (
      <>
        <View style={{ ...card, gap: 8 }}>
          <Text style={labelStyle}>Auto</Text>
          <Text style={{ color: '#16150f', fontSize: 15, fontWeight: '700' }} numberOfLines={2}>{cobro.autoLabel}</Text>
        </View>

        {cobro.choferDelAuto ? (
          <View style={{ ...card, gap: 10 }}>
            <Text style={labelStyle}>Chofer del auto</Text>
            <Text style={{ color: '#16150f', fontSize: 16, fontWeight: '800' }}>{cobro.choferDelAuto}</Text>
            {!!cobro.driver && cobro.driverNombre !== cobro.choferDelAuto && (
              <Text style={{ color: '#8d5c10', fontSize: 12 }}>Va a quedar asignado a {cobro.driverNombre}.</Text>
            )}
            <Pressable onPress={driverSelect.open} style={{ minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button">
              <Text style={{ color: '#5f5a51', fontSize: 13, fontWeight: '700' }}>Cambiar chofer</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Text style={labelStyle}>Elegí el chofer</Text>
            {cobro.opciones.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => cobro.setDriver(o.id)}
                accessibilityRole="button"
                accessibilityLabel={o.label}
                style={{ borderWidth: 1, borderColor: cobro.driver === o.id ? '#16150f' : '#e6ded0', backgroundColor: cobro.driver === o.id ? '#f4efe4' : '#fffdf8', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 15 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a18' }}>{o.label}</Text>
              </Pressable>
            ))}
            {cobro.opciones.length === 0 && <Text style={{ color: '#6b665c', fontSize: 13 }}>Todavía no hay choferes cargados.</Text>}
            <Pressable onPress={() => setNuevoChofer(true)} style={{ minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: '#d9cdb8', alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button">
              <Text style={{ color: '#5f5a51', fontSize: 13, fontWeight: '700' }}>+ Crear chofer nuevo</Text>
            </Pressable>
          </View>
        )}

        {!!cobro.advertencia && (
          <View style={{ backgroundColor: '#fdf0dd', borderRadius: 14, padding: 12 }}>
            <Text style={{ color: '#80642f', fontSize: 12, lineHeight: 17 }}>{cobro.advertencia}</Text>
          </View>
        )}
        {driverSelect.sheet}
      </>
    );
  } else if (r.step === 2) {
    content = (
      <>
        <MoneyDisplay display={r.amountDisplay} color={r.amountColor} hint="Ingreso recibido" />
        <NumericKeypad keys={r.keys} />
      </>
    );
  } else {
    content = (
      <View style={{ ...card, gap: 14 }}>
        <View style={rowStyle}>
          <Text style={{ color: '#6b665c', fontSize: 13 }}>Auto</Text>
          <Text style={{ flex: 1, textAlign: 'right', color: '#16150f', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{cobro.autoLabel}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={{ color: '#6b665c', fontSize: 13 }}>Chofer</Text>
          <Text style={{ flex: 1, textAlign: 'right', color: '#16150f', fontSize: 14, fontWeight: '700' }}>{cobro.driverNombre || '—'}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={{ color: '#6b665c', fontSize: 13 }}>Monto</Text>
          <Text style={{ flex: 1, textAlign: 'right', color: '#256b4d', fontSize: 19, fontWeight: '800' }}>{r.amountDisplay}</Text>
        </View>
        <Pressable onPress={fecha.open} style={rowStyle} accessibilityRole="button">
          <Text style={{ color: '#6b665c', fontSize: 13 }}>Fecha</Text>
          <Text style={{ color: '#16150f', fontSize: 14, fontWeight: '600' }}>{dLblFull(new Date(r.fecha + 'T12:00:00'))}</Text>
        </Pressable>
        <TextInput value={r.nota} onChangeText={r.setNota} placeholder="Nota opcional" placeholderTextColor="#a39a8b" style={{ borderTopWidth: 1, borderTopColor: '#f0e9de', paddingTop: 13, color: '#16150f', fontSize: 14 }} />
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Comprobante de pago · opcional</Text>
          <FileDrop file={cobro.comprobante} onChange={cobro.setComprobante} />
        </View>
        {!!cobro.advertencia && <Text style={{ color: '#80642f', fontSize: 12, lineHeight: 17 }}>{cobro.advertencia}</Text>}
        <Text style={{ color: '#6b665c', fontSize: 12, lineHeight: 17 }}>{cobro.destino}</Text>
        {fecha.picker}
      </View>
    );
  }

  return (
    <>
      <RegistrarWizard
        step={r.progressStep}
        totalSteps={r.totalSteps}
        title={r.stepTitle}
        hint={r.stepHint}
        onBack={r.backStep}
        onNext={esUltimo ? r.submit : r.next}
        nextLabel={esUltimo ? 'Registrar ingreso' : 'Continuar'}
        nextDisabled={r.guardando}
      >
        {content}
      </RegistrarWizard>
      <NuevoChoferSheet
        visible={nuevoChofer}
        onClose={() => setNuevoChofer(false)}
        crear={cobro.crearChofer}
      />
      <NuevoAutoSheet
        visible={nuevoAuto}
        onClose={() => setNuevoAuto(false)}
        crear={cobro.crearAuto}
        sections={cobro.sections}
      />
    </>
  );
}

/** Alta rápida de chofer dentro del cobro: solo el nombre, sin credenciales. */
function NuevoChoferSheet({ visible, onClose, crear }: { visible: boolean; onClose: () => void; crear: CobroView['crearChofer'] }) {
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cerrar = () => {
    if (guardando) return;
    setNombre('');
    setError('');
    onClose();
  };

  const guardar = async () => {
    if (guardando) return;
    if (!nombre.trim()) return setError('Escribí el nombre del chofer');
    setGuardando(true);
    setError('');
    try {
      await crear(nombre.trim());
      setNombre('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el chofer');
    } finally {
      setGuardando(false);
    }
  };

  if (!visible) return null;
  return (
    <BottomSheet title="Nuevo chofer" onClose={cerrar}>
      <View style={{ gap: 6 }}>
        <Text style={labelStyle}>Nombre</Text>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre y apellido"
          placeholderTextColor="#a39a8b"
          autoFocus
          maxLength={80}
          accessibilityLabel="Nombre del chofer"
          style={input}
        />
      </View>
      {!!error && <Text style={errorStyle}>{error}</Text>}
      <Pressable onPress={() => void guardar()} disabled={guardando} style={{ minHeight: 48, borderRadius: 15, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center', opacity: guardando ? 0.6 : 1 }} accessibilityRole="button">
        <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>{guardando ? 'Creando…' : 'Crear chofer'}</Text>
      </Pressable>
    </BottomSheet>
  );
}

/** Alta rápida de auto dentro del cobro: lo mínimo para poder cobrarle. */
function NuevoAutoSheet({ visible, onClose, crear, sections }: { visible: boolean; onClose: () => void; crear: CobroView['crearAuto']; sections: CobroView['sections'] }) {
  const [sectionId, setSectionId] = useState<number | null>(sections[0]?.id ?? null);
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2018');
  const [gpsTag, setGpsTag] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cerrar = () => {
    if (guardando) return;
    setPlate('');
    setModel('');
    setGpsTag('');
    setError('');
    onClose();
  };

  const guardar = async () => {
    if (guardando) return;
    if (!plate.trim()) return setError('La chapa es obligatoria');
    if (!model.trim()) return setError('La marca y modelo son obligatorios');
    setGuardando(true);
    setError('');
    try {
      await crear({
        sectionId,
        plate: plate.trim().toUpperCase(),
        model: model.trim(),
        year: Number(year.replace(/\D/g, '')) || 2018,
        gpsTag: gpsTag.trim(),
      });
      setPlate('');
      setModel('');
      setGpsTag('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el auto');
    } finally {
      setGuardando(false);
    }
  };

  if (!visible) return null;
  return (
    <BottomSheet title="Nuevo auto" onClose={cerrar}>
      {sections.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={labelStyle}>Sección</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {sections.map((s) => (
              <Pressable key={s.id} onPress={() => setSectionId(s.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: sectionId === s.id ? '#16150f' : '#f4efe4' }}>
                <Text style={{ color: sectionId === s.id ? '#fffdf8' : '#3d3a34', fontWeight: '700', fontSize: 12 }}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <Text style={{ color: '#6b665c', fontSize: 12 }}>Se va a crear la sección “General” para poder agregar el auto.</Text>
      )}

      <View style={{ gap: 6 }}>
        <Text style={labelStyle}>Chapa</Text>
        <TextInput value={plate} onChangeText={setPlate} placeholder="ABC 123" placeholderTextColor="#a39a8b" autoCapitalize="characters" maxLength={12} accessibilityLabel="Chapa del auto" style={input} />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={labelStyle}>Marca y modelo</Text>
        <TextInput value={model} onChangeText={setModel} placeholder="Toyota Vitz" placeholderTextColor="#a39a8b" maxLength={60} accessibilityLabel="Marca y modelo del auto" style={input} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={labelStyle}>Año</Text>
          <TextInput value={year} onChangeText={setYear} keyboardType="numeric" maxLength={4} accessibilityLabel="Año del auto" style={input} />
        </View>
        <View style={{ flex: 2, gap: 6 }}>
          <Text style={labelStyle}>GPS tag · opcional</Text>
          <TextInput value={gpsTag} onChangeText={setGpsTag} placeholder="Sin GPS" placeholderTextColor="#a39a8b" maxLength={40} accessibilityLabel="GPS tag del auto" style={input} />
        </View>
      </View>
      {!!error && <Text style={errorStyle}>{error}</Text>}
      <Pressable onPress={() => void guardar()} disabled={guardando} style={{ minHeight: 48, borderRadius: 15, backgroundColor: '#16150f', alignItems: 'center', justifyContent: 'center', opacity: guardando ? 0.6 : 1 }} accessibilityRole="button">
        <Text style={{ color: '#fffdf8', fontSize: 14, fontWeight: '700' }}>{guardando ? 'Creando…' : 'Crear auto'}</Text>
      </Pressable>
    </BottomSheet>
  );
}

const input = { minHeight: 46, borderWidth: 1, borderColor: '#ece4d6', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, color: '#16150f', backgroundColor: '#fffdf8', fontSize: 15 } as const;
const errorStyle = { color: '#a8412f', backgroundColor: '#fbe9e5', borderRadius: 12, padding: 10, fontSize: 12 } as const;
