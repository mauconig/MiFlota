import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MobileView } from '../useMobileView';
import { dLbl } from '../format';

const PAPER = '#fffdf8';
const BORDER = '#ece4d6';
const INK = '#16150f';
const MUTED = '#6b665c';
const SOFT = '#f4f0e8';

function money(value: number) {
  return `Gs. ${new Intl.NumberFormat('es-PY').format(Math.round(value))}`;
}

/** Fecha corta del gasto ("10 sep"), a partir del ISO del servidor. */
function fechaCorta(iso: string) {
  return iso ? dLbl(new Date(iso + 'T12:00:00')) : '';
}

function Boton({ label, onPress, primary = false, disabled = false, flex = 0, compact = false }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean; flex?: number; compact?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={{
        minHeight: 46,
        borderRadius: 15,
        paddingHorizontal: compact ? 10 : 16,
        alignItems: 'center',
        justifyContent: 'center',
        flex: flex || undefined,
        minWidth: 0,
        backgroundColor: primary ? (disabled ? '#bdb4a6' : INK) : PAPER,
        borderWidth: primary ? 0 : 1,
        borderColor: disabled ? '#e2dbcf' : BORDER,
      }}
    >
      <Text numberOfLines={1} style={{ color: primary ? PAPER : disabled ? '#a9a293' : INK, fontSize: compact ? 13 : 14, fontWeight: '700', flexShrink: 1 }}>{label}</Text>
    </Pressable>
  );
}

/** Notas del reporte: primero la pregunta y, si dice que sí, un recorrido auto
 *  por auto mostrando los gastos de ese auto para explicarlos. Se puede saltar
 *  un auto (no guarda cambios de ese) o ir directo a uno desde la tira.
 *
 *  Va en un Modal full-screen (como BottomSheet) para que el teclado no tape el
 *  contenido: la pantalla heredada queda debajo del header y del BottomNav, y
 *  con el teclado abierto no quedaba altura para escribir. */
export function ReporteNotas({ v }: { v: MobileView }) {
  const n = v.reportes.notas;
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  if (!n) return null;

  if (n.fase === 'pregunta') {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={v.reportes.notasCerrar} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(22,21,15,0.32)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 360, backgroundColor: PAPER, borderRadius: 22, borderWidth: 1, borderColor: BORDER, padding: 18, gap: 12 }}>
            <Text style={{ color: INK, fontSize: 19, fontWeight: '800' }}>¿Deseás agregar notas?</Text>
            <Text style={{ color: MUTED, fontSize: 13, lineHeight: 19 }}>
              Las notas se imprimen abajo del total de cada auto, en el PDF del período. Podés escribir una para los gastos de taller, otra para los de mantenimiento y otra para los otros gastos.
            </Text>
            <View style={{ gap: 9, marginTop: 2 }}>
              <Boton label="Sí, agregar notas" onPress={v.reportes.notasSi} primary />
              <Boton label="No, generar directo" onPress={v.reportes.notasNo} />
              <Pressable onPress={v.reportes.notasCerrar} accessibilityRole="button" style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: MUTED, fontSize: 13, fontWeight: '600' }}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const auto = n.autos[n.paso];
  const total = n.autos.length;
  const esUltimo = n.paso === total - 1;
  const conNota = (bloques: { nota: string }[]) => bloques.some((b) => b.nota.trim());

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={v.reportes.notasCerrar} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: SOFT, paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 8, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ flex: 1, color: INK, fontSize: 20, fontWeight: '800' }}>Notas del reporte</Text>
          <Text style={{ color: MUTED, fontSize: 12 }}>{n.paso + 1} de {total}</Text>
          <Pressable onPress={v.reportes.notasCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: INK, fontSize: 15, fontWeight: '700' }}>✕</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
          {n.autos.map((autoDe, i) => (
            <Pressable
              key={autoDe.carId}
              onPress={() => v.reportes.notasIr(i)}
              accessibilityRole="button"
              accessibilityLabel={`Ir a ${autoDe.label}`}
              style={{ minHeight: 30, paddingHorizontal: 10, borderRadius: 11, borderWidth: 1, borderColor: i === n.paso ? INK : BORDER, backgroundColor: conNota(autoDe.bloques) ? '#eef4f0' : PAPER, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#3d3a34', fontSize: 12, fontWeight: '700' }}>{i + 1} {conNota(autoDe.bloques) ? '✓' : '·'}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <KeyboardAwareScrollView
          style={{ flex: 1, minHeight: 0 }}
          mode="layout"
          bottomOffset={24}
          extraKeyboardSpace={24}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 2 }}>
            <Text style={{ color: INK, fontSize: 15, fontWeight: '700' }}>{auto.label}</Text>
            <Text style={{ color: MUTED, fontSize: 12 }}>{auto.seccion} · total del auto {money(auto.total)}</Text>
          </View>

          {auto.bloques.map((bloque) => (
            <View key={bloque.tipo} style={{ backgroundColor: PAPER, borderWidth: 1, borderColor: BORDER, borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#fbf7ee', borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>{bloque.titulo}</Text>
                <Text style={{ color: MUTED, fontSize: 10, fontWeight: '800' }}>{money(bloque.total)}</Text>
              </View>
              {/* La nota va primero: antes quedaba después de todos los gastos y
                  había que bajar hasta el fondo para encontrarla. */}
              <View style={{ paddingHorizontal: 12, paddingTop: 9 }}>
                <TextInput
                  value={bloque.nota}
                  onChangeText={(texto) => v.reportes.notasSetNota(auto.carId, bloque.tipo, texto)}
                  placeholder="Nota para estos gastos (opcional)"
                  placeholderTextColor="#a39a8b"
                  multiline
                  maxLength={300}
                  accessibilityLabel={`Nota de ${bloque.titulo} de ${auto.label}`}
                  style={{ minHeight: 58, borderWidth: 1, borderColor: '#ded3c1', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, color: INK, backgroundColor: PAPER, fontSize: 14, textAlignVertical: 'top' }}
                />
                <Text style={{ color: '#a9a293', fontSize: 10, marginTop: 4, textAlign: 'right' }}>{bloque.nota.length}/300</Text>
              </View>
              <View style={{ paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2 }}>
                {bloque.filas.map((fila, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'baseline', paddingVertical: 3 }}>
                    <Text style={{ width: 50, color: '#a9a293', fontSize: 11 }}>{fechaCorta(fila.fecha)}</Text>
                    <Text style={{ flex: 1, minWidth: 0, color: '#3d3a34', fontSize: 13 }}>{fila.detalle}</Text>
                    <Text style={{ color: INK, fontSize: 13, fontWeight: '600' }}>{money(fila.total)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {!!n.error && <Text style={{ color: '#b34732', backgroundColor: '#fbe9e5', borderRadius: 12, padding: 12, fontSize: 13 }}>{n.error}</Text>}
        </KeyboardAwareScrollView>

        {/* Pegado al teclado: los botones ya no quedan debajo de él. */}
        <KeyboardStickyView>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 12) }}>
            {!esUltimo && <Boton label="Saltar auto" onPress={v.reportes.notasSaltar} compact />}
            <Boton label="Anterior" onPress={v.reportes.notasAnterior} disabled={n.paso === 0} compact />
            <Boton
              label={esUltimo ? (n.guardando ? 'Guardando…' : 'Guardar y generar') : 'Siguiente'}
              onPress={esUltimo ? v.reportes.notasGuardarYExportar : v.reportes.notasSiguiente}
              primary
              compact
              flex={1}
              disabled={esUltimo && n.guardando}
            />
          </View>
        </KeyboardStickyView>
      </View>
    </Modal>
  );
}
