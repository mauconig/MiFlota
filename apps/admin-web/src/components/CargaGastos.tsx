import { useState } from 'react';
import type { Car } from '../types';
import { CATS } from '../data';
import { Btn } from './Btn';
import { MoneyInput } from './MoneyInput';
import { CloseIcon } from '../icons';
import type { ExpenseItemInput } from './AssistantChat';
import { btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover, fieldInput, fieldLabel, fieldLabelText, modalCloseBtn, modalCloseBtnHover, modalFooter, modalOverlay, modalPanel, modalTitle } from '../styles';

interface Fila { key: string; description: string; amount: string }

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Alta manual de gastos: el mismo formato que el borrador del asistente, pero
 *  cargado a mano. Reutiliza el endpoint de cargas del chat, que revalida todo
 *  contra el dueño. */
export function CargaGastos({ cars, onSave }: { cars: Car[]; onSave: (items: ExpenseItemInput[]) => Promise<{ created: number; total: number }> }) {
  const [open, setOpen] = useState(false);
  const [carId, setCarId] = useState('');
  const [category, setCategory] = useState<string>(CATS[1]);
  const [date, setDate] = useState(hoy());
  const [rows, setRows] = useState<Fila[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ created: number; total: number } | null>(null);

  const abrir = () => {
    setCarId(cars[0]?.id ?? '');
    setCategory(CATS[1]);
    setDate(hoy());
    setRows([{ key: 'r0', description: '', amount: '' }]);
    setError('');
    setSaved(null);
    setOpen(true);
  };
  const cerrar = () => { if (!saving) setOpen(false); };
  const editar = (key: string, patch: Partial<Fila>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const quitar = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));
  const agregar = () => setRows((rs) => [...rs, { key: `r${Date.now()}${rs.length}`, description: '', amount: '' }]);
  const total = rows.reduce((sum, row) => sum + (Number(row.amount.replace(/\D/g, '')) || 0), 0);

  const guardar = async () => {
    if (!carId) { setError('Elegí el vehículo.'); return; }
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 12 }}>
              <label style={fieldLabel}>
                <span style={fieldLabelText}>Vehículo</span>
                <select value={carId} onChange={(e) => setCarId(e.target.value)} style={fieldInput}>
                  {!cars.length && <option value="">Sin vehículos</option>}
                  {cars.map((c) => <option key={c.id} value={c.id}>{c.plate} · {c.model}</option>)}
                </select>
              </label>
              <label style={fieldLabel}>
                <span style={fieldLabelText}>Categoría</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={fieldInput}>
                  {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label style={fieldLabel}>
                <span style={fieldLabelText}>Fecha</span>
                <input type="date" value={date} max={hoy()} onChange={(e) => setDate(e.target.value)} style={fieldInput} />
              </label>
            </div>

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
          </div>

          <div style={{ ...modalFooter, justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#6b665c' }}>Total <strong style={{ fontSize: 16, color: '#24271f' }}>Gs. {new Intl.NumberFormat('es-PY').format(total)}</strong></span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={cerrar} style={btnSecondary} hoverStyle={btnSecondaryHover}>Cancelar</Btn>
              <Btn onClick={() => void guardar()} disabled={saving || !cars.length} style={btnPrimary} hoverStyle={btnPrimaryHover} disabledStyle={{ background: '#8d8a80' }}>{saving ? 'Guardando…' : 'Cargar gastos'}</Btn>
            </div>
          </div>
        </>}
      </div>
    </div>}
  </>;
}
