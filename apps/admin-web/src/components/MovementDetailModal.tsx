import { useEffect, useState } from 'react';
import type { View } from '../useFleetView';
import { CATS } from '../data';
import { TODAY, isoLocal, miles } from '../format';
import { Btn } from './Btn';
import { CloseIcon } from '../icons';
import {
  btnPrimary,
  btnPrimaryHover,
  btnSecondary,
  btnSecondaryHover,
  cardTight,
  fieldInput,
  fieldLabel,
  fieldLabelText,
  modalCloseBtn,
  modalCloseBtnHover,
  modalFooter,
  modalOverlay,
  modalPanel,
  modalTitle,
} from '../styles';

const CATS_EGRESO = [...CATS];
const dangerBtn = { border: '1px solid #f0d0c6', background: '#fffdf8', color: '#a8412f', borderRadius: 14, minHeight: 44, padding: '0 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' } as const;
const dangerBtnSolid = { border: 'none', background: '#a8412f', color: '#fffdf8', borderRadius: 14, minHeight: 44, padding: '0 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' } as const;
const warning = { background: '#fdf0dd', color: '#80642f', borderRadius: 14, padding: 12, fontSize: 12, lineHeight: 1.45 } as const;

export function MovementDetailModal({ v }: { v: View }) {
  const d = v.movementDetail;
  const [mode, setMode] = useState<'ver' | 'editar' | 'confirmar'>('ver');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cat, setCat] = useState('');
  const [medio, setMedio] = useState('');
  const [nota, setNota] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [quitarComprobante, setQuitarComprobante] = useState(false);

  // Cada movimiento arranca en modo lectura: abrir otro no puede heredar el
  // formulario a medio editar del anterior.
  useEffect(() => {
    setMode('ver');
    setDeleting(false);
    setSaving(false);
    setError('');
    setArchivo(null);
    setQuitarComprobante(false);
    if (!d) return;
    setMonto(d.edit.monto);
    setFecha(d.edit.fecha);
    setDescripcion(d.edit.descripcion);
    setCat(d.edit.cat);
    setMedio(d.edit.medio);
    setNota(d.edit.nota);
    // `d.id` identifica el movimiento abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.id]);

  if (!d) return null;

  const esGasto = d.edit.kind === 'egreso';

  const eliminar = async () => {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      await d.remove();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el movimiento');
      setDeleting(false);
      setMode('ver');
    }
  };

  const guardar = async () => {
    if (saving) return;
    const montoNum = Number(monto.replace(/\D/g, ''));
    if (!montoNum) return setError('Ingresá el monto');
    if (esGasto && !descripcion.trim()) return setError('Contá de qué es el gasto');
    if (esGasto && !cat) return setError('Elegí una categoría');
    setError('');
    setSaving(true);
    try {
      await d.save({
        monto: montoNum,
        fecha,
        descripcion: descripcion.trim(),
        cat,
        medio: medio.trim(),
        nota: nota.trim(),
        comprobante: archivo,
        quitarComprobante,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el cambio');
      setSaving(false);
    }
  };

  return (
    <div onClick={d.close} style={{ ...modalOverlay, zIndex: 90 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 520, padding: 0, gap: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px', borderBottom: '1px solid #f0ebe0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={modalTitle}>{mode === 'editar' ? 'Editar movimiento' : 'Detalle del movimiento'}</div>
            <div style={{ fontSize: 12, color: '#6b665c', marginTop: 4 }}>{d.dateLbl} · {d.driver}</div>
          </div>
          <span style={{ padding: '6px 10px', borderRadius: 11, background: d.typeBg, color: d.typeFg, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.type}</span>
          <Btn onClick={d.close} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}><CloseIcon size={16} /></Btn>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
          {mode === 'editar' ? (
            <>
              {!esGasto && <div style={warning}>Al cambiar el monto o la fecha se recalcula qué cuotas cancela este pago. El chofer y el auto no se pueden cambiar.</div>}

              <label style={fieldLabel}>
                <span style={fieldLabelText}>Monto</span>
                <input
                  value={miles(monto)}
                  onChange={(e) => setMonto(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="numeric"
                  aria-label="Monto del movimiento"
                  style={fieldInput}
                />
              </label>

              {esGasto ? (
                <>
                  <label style={fieldLabel}>
                    <span style={fieldLabelText}>Descripción</span>
                    <input
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value.slice(0, 120))}
                      aria-label="Descripción del gasto"
                      style={fieldInput}
                    />
                  </label>
                  <label style={fieldLabel}>
                    <span style={fieldLabelText}>Categoría</span>
                    <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría del gasto" style={fieldInput}>
                      {CATS_EGRESO.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label style={fieldLabel}>
                    <span style={fieldLabelText}>Medio (opcional)</span>
                    <input
                      value={medio}
                      onChange={(e) => setMedio(e.target.value.slice(0, 40))}
                      placeholder="Efectivo, transferencia…"
                      aria-label="Medio del pago"
                      style={fieldInput}
                    />
                  </label>
                  <label style={fieldLabel}>
                    <span style={fieldLabelText}>Nota (opcional)</span>
                    <input
                      value={nota}
                      onChange={(e) => setNota(e.target.value.slice(0, 200))}
                      placeholder="Nota del pago"
                      aria-label="Nota del pago"
                      style={fieldInput}
                    />
                  </label>
                </>
              )}

              <label style={fieldLabel}>
                <span style={fieldLabelText}>Fecha</span>
                <input
                  type="date"
                  value={fecha}
                  max={isoLocal(TODAY)}
                  onChange={(e) => setFecha(e.target.value)}
                  aria-label="Fecha del movimiento"
                  style={fieldInput}
                />
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={fieldLabelText}>Comprobante</span>
                {!archivo && d.comprobante && !quitarComprobante && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #e8a13a', background: '#fdf6e8', borderRadius: 14, padding: 10 }}>
                    <a href={d.comprobante.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, color: '#8a6410', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.comprobante.name}</a>
                    <button type="button" onClick={() => setQuitarComprobante(true)} style={{ ...dangerBtn, minHeight: 34, padding: '0 12px', fontSize: 12 }}>Quitar</button>
                  </div>
                )}
                {quitarComprobante && !archivo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 12, color: '#a8412f' }}>El comprobante se quita al guardar.</span>
                    <button type="button" onClick={() => setQuitarComprobante(false)} style={{ ...btnSecondary, minHeight: 34, padding: '0 12px', fontSize: 12 }}>Deshacer</button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                  aria-label="Reemplazar comprobante"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setArchivo(file);
                    if (file) setQuitarComprobante(false);
                  }}
                  style={{ fontSize: 12, color: '#6b665c' }}
                />
                {archivo && <span style={{ fontSize: 11, color: '#6b665c' }}>Se sube al guardar y reemplaza al actual.</span>}
              </div>

              {error && <div style={{ color: '#a8412f', background: '#fbe9e5', borderRadius: 12, padding: 10, fontSize: 12 }}>{error}</div>}
            </>
          ) : (
            <>
              <div style={{ ...cardTight, padding: 16, background: d.typeBg }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#6b665c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monto</div>
                <div style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: d.amountFg, marginTop: 6 }}>{d.amount}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Info label="Chofer" value={d.driver} />
                <Info label="Vehículo" value={d.vehicle} />
                <Info label="Medio" value={d.medio} />
                <Info label="Fecha" value={d.dateLbl} />
                <Info label="Categoría" value={d.category} />
                <Info label="GPS tag" value={d.gpsTag} />
              </div>

              {d.note && <Info label="Nota" value={d.note} />}

              {d.comprobante && <ComprobantePreview comprobante={d.comprobante} />}

              <section style={{ ...cardTight, padding: 15 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Aplicado a cuotas</div>
                {d.appliedQuotas.length ? d.appliedQuotas.map((q) => (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid #f4efe4' }}>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.description}</div><div style={{ fontSize: 11, color: '#6b665c', marginTop: 2 }}>{q.dateLbl} · {q.vehicle}</div></div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#2e7d5b' }}>{q.amount}</span>
                  </div>
                )) : <div style={{ fontSize: 12, color: '#6b665c' }}>{d.category === 'Pago' || d.category === 'Ajuste' ? 'Todavía no se aplicó a una cuota.' : 'Los gastos no se aplican a cuotas.'}</div>}
                {d.saldoAFavor && <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f4efe4', fontSize: 12, color: '#2e7d5b', fontWeight: 700 }}>Saldo a favor: {d.saldoAFavor}</div>}
              </section>

              {error && <div style={{ color: '#a8412f', background: '#fbe9e5', borderRadius: 12, padding: 10, fontSize: 12 }}>{error}</div>}
            </>
          )}
        </div>

        <div style={{ ...modalFooter, padding: '14px 24px', justifyContent: 'space-between' }}>
          {mode === 'editar' ? (
            <>
              <Btn onClick={() => setMode('ver')} style={btnSecondary} hoverStyle={btnSecondaryHover} disabled={saving}>Cancelar</Btn>
              <Btn onClick={guardar} disabled={saving} style={btnPrimary} hoverStyle={btnPrimaryHover} disabledStyle={{ opacity: 0.6 }}>{saving ? 'Guardando…' : 'Guardar cambios'}</Btn>
            </>
          ) : mode === 'confirmar' ? (
            <>
              <span style={{ flex: 1, fontSize: 12, color: '#a8412f', lineHeight: 1.4 }}>
                Esta acción no se puede deshacer.
                {esGasto && cat === 'Mantenimiento' ? ' El auto conserva la fecha y el kilometraje del service.' : ''}
              </span>
              <Btn onClick={() => setMode('ver')} style={btnSecondary} hoverStyle={btnSecondaryHover} disabled={deleting}>Cancelar</Btn>
              <Btn onClick={eliminar} disabled={deleting} style={dangerBtnSolid} disabledStyle={{ opacity: 0.6 }}>{deleting ? 'Eliminando…' : 'Sí, eliminar'}</Btn>
            </>
          ) : (
            <>
              <Btn onClick={() => setMode('editar')} style={btnSecondary} hoverStyle={btnSecondaryHover}>Editar movimiento</Btn>
              <Btn onClick={() => setMode('confirmar')} style={dangerBtn} hoverStyle={{ background: '#fdeeea' }}>Eliminar movimiento</Btn>
              <Btn onClick={d.close} style={btnSecondary} hoverStyle={btnSecondaryHover}>Cerrar</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div style={{ ...cardTight, padding: '12px 13px', minWidth: 0 }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b665c' }}>{label}</div><div style={{ marginTop: 5, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || 'Sin especificar'}</div></div>;
}

function ComprobantePreview({ comprobante }: { comprobante: { url: string; name: string; type: string } }) {
  const image = comprobante.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(comprobante.name);
  const pdf = comprobante.type === 'application/pdf' || /\.pdf$/i.test(comprobante.name);
  return (
    <section style={{ ...cardTight, padding: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Comprobante · {comprobante.name}</span>
        <a href={comprobante.url} target="_blank" rel="noreferrer" style={{ color: '#8d5c10', fontSize: 12, fontWeight: 700, flex: 'none' }}>Abrir completo</a>
      </div>
      {image ? <img src={comprobante.url} alt={'Comprobante ' + comprobante.name} style={{ display: 'block', width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 10, background: '#f4f0e8' }} /> : pdf ? <iframe title={'Vista previa de ' + comprobante.name} src={comprobante.url} style={{ display: 'block', width: '100%', height: 280, border: '1px solid #ece4d6', borderRadius: 10, background: '#f4f0e8' }} /> : <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: '#6b665c', background: '#f4f0e8', borderRadius: 10 }}>Vista previa no disponible para este archivo.</div>}
    </section>
  );
}
