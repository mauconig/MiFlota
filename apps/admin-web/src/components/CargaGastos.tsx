import { useState } from 'react';
import type { Car } from '../types';
import { CATS } from '../data';
import { Btn } from './Btn';
import { MoneyInput } from './MoneyInput';
import { CloseIcon } from '../icons';
import type { ExpenseItemInput } from './AssistantChat';
import { btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover, fieldInput, fieldLabel, fieldLabelText, modalCloseBtn, modalCloseBtnHover, modalFooter, modalOverlay, modalPanel, modalTitle } from '../styles';

interface Fila { key: string; description: string; amount: string }
type Paso = 1 | 2 | 3;

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Sin acentos ni mayúsculas: "blanco" tiene que encontrar "Hyundai Gran i10 blanco". */
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const PASOS: { n: Paso; label: string }[] = [
  { n: 1, label: 'Vehículo' },
  { n: 2, label: 'Categoría' },
  { n: 3, label: 'Gastos' },
];

/** Alta manual de gastos en tres pasos: elegís el auto buscándolo, la categoría
 *  y por último las líneas. Reutiliza el endpoint de cargas del chat, que
 *  revalida todo contra el dueño. */
export function CargaGastos({ cars, onSave }: { cars: Car[]; onSave: (items: ExpenseItemInput[]) => Promise<{ created: number; total: number }> }) {
  const [open, setOpen] = useState(false);
  const [paso, setPaso] = useState<Paso>(1);
  const [busqueda, setBusqueda] = useState('');
  const [carId, setCarId] = useState('');
  const [category, setCategory] = useState<string>(CATS[1]);
  const [date, setDate] = useState(hoy());
  const [rows, setRows] = useState<Fila[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ created: number; total: number } | null>(null);

  const car = cars.find((c) => c.id === carId);
  const query = norm(busqueda.trim());
  const sugerencias = (query ? cars.filter((c) => norm(`${c.plate} ${c.model} ${c.year} ${c.driver} ${c.gpsTag}`).includes(query)) : cars).slice(0, 8);

  const abrir = () => {
    setPaso(1);
    setBusqueda('');
    setCarId('');
    setCategory(CATS[1]);
    setDate(hoy());
    setRows([{ key: 'r0', description: '', amount: '' }]);
    setError('');
    setSaved(null);
    setOpen(true);
  };
  const cerrar = () => { if (!saving) setOpen(false); };
  const elegirAuto = (c: Car) => { setCarId(c.id); setError(''); setPaso(2); };
  const editar = (key: string, patch: Partial<Fila>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const quitar = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));
  const agregar = () => setRows((rs) => [...rs, { key: `r${Date.now()}${rs.length}`, description: '', amount: '' }]);
  const total = rows.reduce((sum, row) => sum + (Number(row.amount.replace(/\D/g, '')) || 0), 0);

  const guardar = async () => {
    const items: ExpenseItemInput[] = rows
      .map((row) => ({ carId, description: row.description.trim(), amount: Number(row.amount.replace(/\D/g, '')) || 0, category, date }))
      .filter((item) => item.description && item.amount > 0);
    if (!items.length) { setError('Agregá al menos una línea con descripción y monto.'); return; }
    setSaving(true);
    setError('');
    try {
      setSaved(await onSave(items));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el gasto.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <button type="button" className="ai-add-launcher" onClick={abrir} aria-label="Cargar gastos manualmente" title="Cargar gastos">＋</button>
    {open && <div onClick={cerrar} style={{ ...modalOverlay, zIndex: 78 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalPanel, width: 520 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={modalTitle}>Cargar gastos</span>
          <Btn onClick={cerrar} ariaLabel="Cerrar" style={modalCloseBtn} hoverStyle={modalCloseBtnHover}><CloseIcon size={16} /></Btn>
        </div>

        {saved ? <>
          <p style={{ margin: 0, fontSize: 14, color: '#2e7d5b', fontWeight: 700 }}>Se guardaron {saved.created} gasto{saved.created === 1 ? '' : 's'} por Gs. {new Intl.NumberFormat('es-PY').format(saved.total)}.</p>
          <div style={modalFooter}><Btn onClick={() => setOpen(false)} style={btnPrimary} hoverStyle={btnPrimaryHover}>Listo</Btn></div>
        </> : <>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center', fontSize: 11, color: '#8a7e68' }}>
            {PASOS.map((p, i) => <span key={p.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span aria-hidden="true" style={{ color: '#c9b995' }}>›</span>}
              <span style={{ fontWeight: paso === p.n ? 750 : 600, color: paso === p.n ? '#24271f' : paso > p.n ? '#6b5837' : '#a99f8c' }}>{p.n} · {p.label}</span>
            </span>)}
          </div>

          {paso === 1 && <>
            <div style={fieldLabel}>
              <span style={fieldLabelText}>Buscá el vehículo</span>
              <input autoFocus value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Chapa, modelo, color (GPS) o chofer… por ejemplo “blanco”" style={fieldInput} aria-label="Buscar vehículo" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflow: 'auto' }}>
              {sugerencias.map((c) => <button key={c.id} type="button" onClick={() => elegirAuto(c)} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, textAlign: 'left', border: '1px solid #e0d7c6', background: '#fffdf8', borderRadius: 12, padding: '11px 13px', cursor: 'pointer' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#24271f' }}>{c.plate}</span>
                <span style={{ fontSize: 12, color: '#756e5f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.model} · {c.year}{c.gpsTag ? ' · ' + c.gpsTag : ''}</span>
              </button>)}
              {!sugerencias.length && <p style={{ margin: 0, fontSize: 12, color: '#8a7e68' }}>No encontré ningún vehículo con “{busqueda.trim()}”. Probá con la chapa, el modelo o el color.</p>}
            </div>
          </>}

          {paso === 2 && <>
            <div style={fieldLabel}>
              <span style={fieldLabelText}>Categoría del gasto</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CATS.map((c) => <button key={c} type="button" onClick={() => { setCategory(c); setError(''); setPaso(3); }} style={{ textAlign: 'left', border: `1px solid ${category === c ? '#bda477' : '#e0d7c6'}`, background: category === c ? '#faf3e4' : '#fffdf8', borderRadius: 12, padding: '12px 13px', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#3b3831' }}>{c}</button>)}
            </div>
          </>}

          {paso === 3 && <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f4eedf', border: '1px solid #e5ddce', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                <strong style={{ fontSize: 13 }}>{car ? `${car.plate} · ${car.model}` : 'Sin vehículo'}</strong>
                <small style={{ fontSize: 11, color: '#756e5f' }}>{category}</small>
              </div>
              <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                <button type="button" onClick={() => setPaso(1)} style={{ border: 'none', background: 'none', color: '#705620', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cambiar auto</button>
                <button type="button" onClick={() => setPaso(2)} style={{ border: 'none', background: 'none', color: '#705620', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cambiar categoría</button>
              </div>
            </div>

            <label style={{ ...fieldLabel, maxWidth: 160 }}>
              <span style={fieldLabelText}>Fecha</span>
              <input type="date" value={date} max={hoy()} onChange={(e) => setDate(e.target.value)} style={fieldInput} />
            </label>

            <div style={fieldLabel}>
              <span style={fieldLabelText}>Gastos</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map((row) => <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 30px', gap: 7, alignItems: 'center' }}>
                  <input value={row.description} onChange={(e) => editar(row.key, { description: e.target.value })} placeholder="Qué se gastó" maxLength={120} style={fieldInput} aria-label="Descripción del gasto" />
                  <span style={{ ...fieldInput, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, color: '#a09a8d', flex: 'none' }}>₲</span>
                    <MoneyInput value={row.amount} onChange={(v) => editar(row.key, { amount: v })} placeholder="0" ariaLabel="Monto del gasto" style={{ flex: 1, minWidth: 0, width: '100%', border: 'none', background: 'none', outline: 'none', fontSize: 14, color: '#1a1a18', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }} />
                  </span>
                  <Btn onClick={() => quitar(row.key)} ariaLabel="Borrar línea" style={{ border: 'none', background: 'none', color: '#a8412f', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</Btn>
                </div>)}
                <button type="button" onClick={agregar} style={{ alignSelf: 'flex-start', border: '1px dashed #cfc3ac', background: '#faf7ef', borderRadius: 8, padding: '7px 11px', fontSize: 12, color: '#6b5837', cursor: 'pointer' }}>+ Agregar línea</button>
              </div>
            </div>

            {error && <p role="alert" style={{ margin: 0, color: '#934f37', fontSize: 12 }}>{error}</p>}
          </>}

          <div style={{ ...modalFooter, justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#6b665c' }}>{paso === 3 ? <>Total <strong style={{ fontSize: 16, color: '#24271f' }}>Gs. {new Intl.NumberFormat('es-PY').format(total)}</strong></> : ''}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {paso > 1 && <Btn onClick={() => setPaso((paso - 1) as Paso)} style={btnSecondary} hoverStyle={btnSecondaryHover}>Volver</Btn>}
              <Btn onClick={cerrar} style={btnSecondary} hoverStyle={btnSecondaryHover}>Cancelar</Btn>
              {paso === 3 && <Btn onClick={() => void guardar()} disabled={saving} style={btnPrimary} hoverStyle={btnPrimaryHover} disabledStyle={{ background: '#8d8a80' }}>{saving ? 'Guardando…' : 'Cargar gastos'}</Btn>}
            </div>
          </div>
        </>}
      </div>
    </div>}
  </>;
}
