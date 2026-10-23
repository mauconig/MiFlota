import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { MovementDetailView } from '../useMobileView';
import type { PickedFile } from '../types';
import { BottomSheet } from './BottomSheet';
import { ChipRow } from './ChipRow';
import { ComprobantePreview } from './ComprobantePreview';
import { useDateField } from './DateField';
import { FileDrop } from './FileDrop';
import { CATS } from '../data';
import { TODAY, dLblFull, isoLocal, miles } from '../format';

const CATS_EGRESO = [...CATS];

/** Detalle de un movimiento con sus dos correcciones: editar y eliminar.
 *  El modo edición vive en la misma hoja para no perder el contexto y porque
 *  el BottomSheet ya resuelve el teclado y el safe area. */
export function MovementDetailSheet({ movement }: { movement: MovementDetailView | null }) {
  const [mode, setMode] = useState<'ver' | 'editar' | 'confirmar'>('ver');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cat, setCat] = useState('');
  const [medio, setMedio] = useState('');
  const [nota, setNota] = useState('');
  const [adjunto, setAdjunto] = useState<PickedFile | null>(null);
  const [quitarComprobante, setQuitarComprobante] = useState(false);

  const dateField = useDateField(fecha, setFecha, isoLocal(TODAY));
  const movementId = movement?.id;

  // Cada movimiento arranca limpio: si se cierra y se abre otro, no puede
  // quedar el formulario del anterior a medio editar.
  useEffect(() => {
    setMode('ver');
    setGuardando(false);
    setError('');
    setAdjunto(null);
    setQuitarComprobante(false);
    if (!movement) return;
    setMonto(movement.edit.monto);
    setFecha(movement.edit.fecha);
    setDescripcion(movement.edit.descripcion);
    setCat(movement.edit.cat);
    setMedio(movement.edit.medio);
    setNota(movement.edit.nota);
    // `movementId` es la identidad estable para este reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementId]);

  if (!movement) return null;

  const esGasto = movement.edit.kind === 'egreso';

  const guardar = async () => {
    if (guardando) return;
    const montoNum = Number(monto.replace(/\D/g, ''));
    if (!montoNum) return setError('Ingresá el monto');
    if (esGasto && !descripcion.trim()) return setError('Contá de qué es el gasto');
    if (esGasto && !cat) return setError('Elegí una categoría');
    setError('');
    setGuardando(true);
    try {
      await movement.save({
        monto: montoNum,
        fecha,
        descripcion: descripcion.trim(),
        cat,
        medio: medio.trim(),
        nota: nota.trim(),
        comprobante: adjunto,
        quitarComprobante,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el cambio');
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (guardando) return;
    setError('');
    setGuardando(true);
    try {
      await movement.remove();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el movimiento');
      setGuardando(false);
      setMode('ver');
    }
  };

  if (mode === 'editar') {
    return (
      <BottomSheet
        title="Editar movimiento"
        onClose={() => { if (!guardando) setMode('ver'); }}
        footer={(
          <>
            {!!error && <Text style={{ ...errorStyle, marginBottom: 8 }}>{error}</Text>}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Boton label="Cancelar" onPress={() => setMode('ver')} disabled={guardando} />
              <Boton label={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={() => void guardar()} primary disabled={guardando} flex={1} />
            </View>
          </>
        )}
      >
        {!esGasto && (
          <View style={{ backgroundColor: '#fdf0dd', borderRadius: 14, padding: 12 }}>
            <Text style={{ color: '#80642f', fontSize: 12, lineHeight: 17 }}>
              Al cambiar el monto o la fecha se recalcula qué cuotas cancela este pago. El chofer y el auto no se pueden cambiar.
            </Text>
          </View>
        )}

        <Campo label="Monto">
          <TextInput
            value={miles(monto)}
            onChangeText={(v) => setMonto(v.replace(/\D/g, '').slice(0, 10))}
            keyboardType="number-pad"
            accessibilityLabel="Monto del movimiento"
            style={input}
          />
        </Campo>

        {esGasto ? (
          <>
            <Campo label="Descripción">
              <TextInput
                value={descripcion}
                onChangeText={setDescripcion}
                maxLength={120}
                multiline
                accessibilityLabel="Descripción del gasto"
                style={{ ...input, minHeight: 52, textAlignVertical: 'top' }}
              />
            </Campo>
            <Campo label="Categoría">
              <ChipRow
                wrap
                chips={CATS_EGRESO.map((name) => ({
                  label: name,
                  bg: cat === name ? '#16150f' : '#fffdf8',
                  fg: cat === name ? '#fffdf8' : '#5f5a51',
                  bd: cat === name ? '#16150f' : '#e6ded0',
                  pick: () => setCat(name),
                }))}
              />
            </Campo>
          </>
        ) : (
          <>
            <Campo label="Medio (opcional)">
              <TextInput
                value={medio}
                onChangeText={setMedio}
                maxLength={40}
                placeholder="Efectivo, transferencia…"
                placeholderTextColor="#a39a8b"
                accessibilityLabel="Medio del pago"
                style={input}
              />
            </Campo>
            <Campo label="Nota (opcional)">
              <TextInput
                value={nota}
                onChangeText={setNota}
                maxLength={200}
                multiline
                placeholder="Nota del pago"
                placeholderTextColor="#a39a8b"
                accessibilityLabel="Nota del pago"
                style={{ ...input, minHeight: 52, textAlignVertical: 'top' }}
              />
            </Campo>
          </>
        )}

        <Campo label="Fecha">
          <Pressable onPress={dateField.open} accessibilityRole="button" accessibilityLabel="Cambiar fecha" style={input}>
            <Text style={{ color: '#16150f', fontSize: 15 }}>{fecha ? dLblFull(new Date(fecha + 'T12:00:00')) : 'Elegí una fecha'}</Text>
          </Pressable>
        </Campo>
        {dateField.picker}

        <Campo label="Comprobante">
          <FileDrop
            file={adjunto}
            onChange={(f) => {
              setAdjunto(f);
              if (f) setQuitarComprobante(false);
            }}
          />
          {!adjunto && movement.comprobante && !quitarComprobante && (
            <ComprobantePreview source={movement.comprobante} onRemove={() => setQuitarComprobante(true)} />
          )}
          {!adjunto && quitarComprobante && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ flex: 1, color: '#a8412f', fontSize: 12 }}>El comprobante se quita al guardar.</Text>
              <Pressable onPress={() => setQuitarComprobante(false)} accessibilityRole="button" accessibilityLabel="Deshacer quitar comprobante">
                <Text style={{ color: '#8d5c10', fontSize: 12, fontWeight: '700' }}>Deshacer</Text>
              </Pressable>
            </View>
          )}
        </Campo>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      title="Detalle del movimiento"
      onClose={movement.close}
      footer={mode === 'confirmar' ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: '#a8412f', fontSize: 12, lineHeight: 17 }}>
            Esta acción no se puede deshacer.
            {esGasto && cat === 'Mantenimiento' ? ' El auto conserva la fecha y el kilometraje del service.' : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Boton label="Cancelar" onPress={() => setMode('ver')} disabled={guardando} />
            <Boton label={guardando ? 'Eliminando…' : 'Sí, eliminar'} onPress={() => void eliminar()} danger disabled={guardando} flex={1} />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton label="Editar" onPress={() => setMode('editar')} flex={1} />
          <Boton label="Eliminar" onPress={() => setMode('confirmar')} danger flex={1} />
        </View>
      )}
    >
      <View style={{ backgroundColor: movement.typeBg, borderRadius: 18, padding: 16 }}>
        <Text style={{ color: movement.typeFg, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>{movement.type}</Text>
        <Text style={{ color: movement.amountColor, fontSize: 28, fontWeight: '800', marginTop: 5 }}>{movement.amount}</Text>
        <Text style={{ color: '#6b665c', fontSize: 13, fontWeight: '600', marginTop: 4 }} numberOfLines={2}>{movement.title}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Info label="Fecha" value={movement.date} />
        <Info label="Medio" value={movement.medio} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Info label="Vehículo" value={movement.vehicle} />
        <Info label="Chofer" value={movement.driver} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Info label="Categoría" value={movement.category} />
        <Info label="GPS tag" value={movement.gpsTag} />
      </View>
      <Info label="Sección" value={movement.section} />
      {!!movement.note && <Info label="Detalle" value={movement.note} multiline />}

      {movement.comprobante && <ComprobantePreview source={movement.comprobante} />}

      {!!error && <Text style={errorStyle}>{error}</Text>}
    </BottomSheet>
  );
}

function Boton({ label, onPress, primary = false, danger = false, disabled = false, flex = 0 }: { label: string; onPress: () => void; primary?: boolean; danger?: boolean; disabled?: boolean; flex?: number }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={{
        flex,
        minHeight: 46,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: primary || danger ? 0 : 1,
        borderColor: '#d9cdb8',
        backgroundColor: primary ? '#16150f' : danger ? '#a8412f' : '#fffdf8',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text style={{ color: primary || danger ? '#fffdf8' : '#3d3a34', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={labelStyle}>{label}</Text>
      {children}
    </View>
  );
}

function Info({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: '#f7f3eb', borderRadius: 15, padding: 12 }}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#3d3a34', marginTop: 5 }} numberOfLines={multiline ? 4 : 1}>{value || 'Sin especificar'}</Text>
    </View>
  );
}

const input = { minHeight: 46, borderWidth: 1, borderColor: '#ece4d6', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, color: '#16150f', backgroundColor: '#fffdf8', fontSize: 15, justifyContent: 'center' as const };
const labelStyle = { color: '#6b665c', fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.7, textTransform: 'uppercase' as const };
const errorStyle = { color: '#a8412f', backgroundColor: '#fbe9e5', borderRadius: 12, padding: 10, fontSize: 12 };
