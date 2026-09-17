import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { modalOverlay, modalPanel, modalTitle, modalCloseBtn, modalCloseBtnHover, modalFooter, btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover, fieldInput } from '../styles';

const money = (n: number) => '₲ ' + n.toLocaleString('es-PY');

/** Notas del reporte: primero la pregunta y, si dice que sí, un recorrido auto
 *  por auto mostrando los gastos de ese auto para explicarlos. Se puede saltar
 *  un auto (no guarda cambios de ese) o ir directo a uno desde la tira. */
export function NotasModal({ v }: { v: View }) {
  const n = v.notas;
  if (!n) return null;

  if (n.fase === 'pregunta') {
    return (
      <div style={{ ...modalOverlay, zIndex: 78 }} onClick={v.notasCerrar}>
        <div style={{ ...modalPanel, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={modalTitle}>¿Deseás agregar notas?</span>
            <Btn onClick={v.notasCerrar} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}>✕</Btn>
          </div>
          <div style={{ fontSize: 13, color: '#6b665c', lineHeight: 1.55 }}>
            Las notas se imprimen abajo del total de cada auto, en el PDF del período. Podés escribir una para los gastos de taller y otra para los otros gastos.
          </div>
          <div style={{ ...modalFooter, justifyContent: 'flex-end' }}>
            <Btn onClick={v.notasNo} style={btnSecondary} hoverStyle={btnSecondaryHover}>No, exportar directo</Btn>
            <Btn onClick={v.notasSi} style={btnPrimary} hoverStyle={btnPrimaryHover}>Sí, agregar notas</Btn>
          </div>
        </div>
      </div>
    );
  }

  const auto = n.autos[n.paso];
  const total = n.autos.length;
  const esUltimo = n.paso === total - 1;
  const conNota = (a: (typeof n.autos)[number]) => a.bloques.some((b) => b.nota.trim());

  return (
    <div style={{ ...modalOverlay, zIndex: 78 }}>
      <div style={{ ...modalPanel, maxWidth: 620, maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={modalTitle}>Notas del reporte</span>
          <span style={{ fontSize: 12, color: '#6b665c' }}>{n.paso + 1} de {total}</span>
          <Btn onClick={v.notasCerrar} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}>✕</Btn>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {n.autos.map((autoDe, i) => (
            <Btn
              key={autoDe.carId}
              onClick={() => v.notasIr(i)}
              ariaLabel={`Ir a ${autoDe.label}`}
              style={{
                border: `1px solid ${i === n.paso ? '#16150f' : '#e6ded0'}`,
                background: conNota(autoDe) ? '#eef4f0' : '#fffdf8',
                color: '#3d3a34',
                borderRadius: 10,
                minHeight: 28,
                padding: '0 9px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              hoverStyle={{ borderColor: '#c9bfae' }}
            >
              {i + 1} {conNota(autoDe) ? '✓' : '·'}
            </Btn>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{auto.label}</div>
          <div style={{ fontSize: 12, color: '#6b665c', marginTop: 2 }}>{auto.seccion} · total del auto {money(auto.total)}</div>
        </div>

        {auto.bloques.map((bloque) => (
          <div key={bloque.tipo} style={{ border: '1px solid #ece4d6', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: '#fbf7ee', borderBottom: '1px solid #ece4d6', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#6b665c' }}>
              <span>{bloque.titulo}</span>
              <span>{money(bloque.total)}</span>
            </div>
            <div style={{ padding: '6px 12px 2px' }}>
              {bloque.filas.map((fila, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'baseline', padding: '3px 0' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#3d3a34' }}>{fila.detalle}</span>
                  <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{money(fila.total)}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '4px 12px 12px' }}>
              <textarea
                value={bloque.nota}
                onChange={(e) => v.notasSetNota(auto.carId, bloque.tipo, e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Nota para estos gastos (opcional)"
                aria-label={`Nota de ${bloque.titulo} de ${auto.label}`}
                style={{ ...fieldInput, minHeight: 58, resize: 'vertical', lineHeight: 1.45 }}
              />
              <div style={{ fontSize: 11, color: '#a9a293', marginTop: 4, textAlign: 'right' }}>{bloque.nota.length}/300</div>
            </div>
          </div>
        ))}

        {!!n.error && <div style={{ background: '#fff0e8', borderRadius: 12, padding: 11, fontSize: 12, color: '#934f37' }}>{n.error}</div>}

        <div style={{ ...modalFooter, justifyContent: 'space-between' }}>
          <Btn onClick={v.notasSaltar} style={btnSecondary} hoverStyle={btnSecondaryHover}>Saltar auto</Btn>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={v.notasAnterior} style={btnSecondary} hoverStyle={btnSecondaryHover} disabled={n.paso === 0} disabledStyle={{ opacity: 0.5 }}>Anterior</Btn>
            {esUltimo ? (
              <Btn onClick={v.notasGuardarYExportar} style={btnPrimary} hoverStyle={btnPrimaryHover} disabled={n.guardando} disabledStyle={{ opacity: 0.6 }}>
                {n.guardando ? 'Guardando…' : 'Guardar y exportar'}
              </Btn>
            ) : (
              <Btn onClick={v.notasSiguiente} style={btnPrimary} hoverStyle={btnPrimaryHover}>Siguiente</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
