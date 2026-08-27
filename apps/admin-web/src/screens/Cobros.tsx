import { useState } from 'react';
import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { ChipRow } from '../components/ChipRow';
import { SearchBar } from '../components/SearchBar';
import { Screen, ScrollArea, Vacio } from '../components/Screen';
import { PlusIcon } from '../icons';
import { card } from '../styles';

/** Encabezado de columnas. Sin él, dos montos seguidos en la misma fila no
 *  dicen cuál es cuál. Los anchos van pegados a los de las filas de abajo. */
const th: React.CSSProperties = {
  padding: '8px 20px',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 13,
  borderBottom: '1px solid #f0ebe0',
  flex: 'none',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#6b665c',
};

const avatar: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 18,
  background: '#f4f0e8',
  color: '#5f5a51',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  flex: 'none',
};

const tag: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  padding: '5px 10px',
  borderRadius: 11,
};

type SortState = { key: string; direction: 1 | -1 };

function compareRows(a: { sort: Record<string, string | number> }, b: { sort: Record<string, string | number> }, state: SortState) {
  const av = a.sort[state.key] ?? '';
  const bv = b.sort[state.key] ?? '';
  if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * state.direction;
  return String(av).localeCompare(String(bv), 'es', { numeric: true, sensitivity: 'base' }) * state.direction;
}

function SortHeader({ label, sortKey, state, onSort, width, grow = false, align = 'left' }: { label: string; sortKey: string; state: SortState; onSort: (key: string) => void; width?: number; grow?: boolean; align?: 'left' | 'right' }) {
  const active = state.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={'Ordenar por ' + label}
      aria-sort={active ? (state.direction === 1 ? 'ascending' : 'descending') : 'none'}
      style={{ width, flex: grow ? 1 : 'none', minWidth: grow ? 0 : undefined, display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: 5, padding: 0, border: 'none', background: 'none', color: active ? '#8a641c' : '#6b665c', font: 'inherit', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', textAlign: align }}
    >
      <span>{label}</span>
      <span aria-hidden="true" style={{ width: 9, height: 13, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
        <span style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: `5px solid ${active && state.direction === 1 ? '#e8a13a' : '#bdb6a4'}` }} />
        <span style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${active && state.direction === -1 ? '#e8a13a' : '#bdb6a4'}` }} />
      </span>
    </button>
  );
}

export function Cobros({ v }: { v: View }) {
  const enPagos = v.cobrosTab === 'pagos';
  const [sort, setSort] = useState<SortState>({ key: 'date', direction: -1 });
  const onSort = (key: string) => setSort((current) => current.key === key ? { key, direction: current.direction === 1 ? -1 : 1 } : { key, direction: 1 });
  const movimientos = [...v.movimientosFull].sort((a, b) => compareRows(a, b, sort));
  const cobros = [...v.cobrosFull].sort((a, b) => compareRows(a, b, sort));

  return (
    <Screen label="Cobros" style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap', borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
        <ChipRow chips={v.cobrosTabChips} />
        <span style={{ width: 1, height: 20, background: '#ece4d6', margin: '0 4px' }} />
        <SearchBar value={v.pendQ} onChange={v.setPendQ} placeholder="Buscar chofer o chapa…" />
        {!enPagos && <ChipRow chips={v.pendKindChips} />}
        <span style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#6b665c' }}>{enPagos ? v.movimientosSub : v.cobrosSub}</span>
          <Btn
            onClick={v.abrirPago}
            style={{ border: 'none', background: '#16150f', color: '#fffdf8', borderRadius: 12, minHeight: 34, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, flex: 'none' }}
            hoverStyle={{ background: '#2a2820' }}
          >
            <PlusIcon size={14} />
            Registrar pago
          </Btn>
        </span>
      </div>

      {enPagos ? (
        <>
          <div style={th}>
            <span style={{ width: 36, flex: 'none' }} />
            <SortHeader label="Chofer" sortKey="driver" state={sort} onSort={onSort} width={190} />
            <SortHeader label="Vehículo" sortKey="vehicle" state={sort} onSort={onSort} grow />
            <SortHeader label="Detalle" sortKey="note" state={sort} onSort={onSort} width={220} />
            <SortHeader label="Fecha" sortKey="date" state={sort} onSort={onSort} width={74} />
            <SortHeader label="Tipo" sortKey="type" state={sort} onSort={onSort} width={84} />
            <SortHeader label="Monto" sortKey="amount" state={sort} onSort={onSort} width={96} align="right" />
          </div>
          {!v.movimientosFull.length && (
            <Vacio titulo="Sin movimientos en el período" detalle="Acá queda el libro de lo que entró y salió, con la fecha real de cada movimiento." />
          )}
          <ScrollArea style={{ padding: '4px 20px' }}>
            {movimientos.map((m) => (
              <div key={m.id} role="button" tabIndex={0} onClick={m.open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); m.open(); } }} aria-label={'Ver detalle del movimiento de ' + m.driver} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13, padding: '11px 0', borderBottom: '1px solid #f4efe4', cursor: 'pointer' }}>
                <span style={avatar}>{m.initials}</span>
                <span style={{ width: 190, flex: 'none', fontSize: 14, fontWeight: 700 }}>{m.driver}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#6b665c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.carLbl}</span>
                <span style={{ width: 220, flex: 'none', fontSize: 12, color: '#6b665c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.detalle}</span>
                <span style={{ width: 74, flex: 'none', fontSize: 12, color: '#6b665c' }}>{m.dateLbl}</span>
                <span style={{ width: 84, flex: 'none' }}>
                  <span style={{ ...tag, background: m.tagBg, color: m.tagFg }}>{m.tag}</span>
                </span>
                <span style={{ width: 96, flex: 'none', textAlign: 'right', fontSize: 14, fontWeight: 700, color: m.tagFg }}>{m.monto}</span>
              </div>
            ))}
          </ScrollArea>
        </>
      ) : (
        <>
          <div style={th}>
            <span style={{ width: 36, flex: 'none' }} />
            <SortHeader label="Chofer" sortKey="driver" state={sort} onSort={onSort} width={190} />
            <SortHeader label="Concepto" sortKey="description" state={sort} onSort={onSort} grow />
            <SortHeader label="Fecha" sortKey="date" state={sort} onSort={onSort} width={74} />
            <SortHeader label="Estado" sortKey="status" state={sort} onSort={onSort} width={84} />
            <SortHeader label="Cobrado" sortKey="amount" state={sort} onSort={onSort} width={122} align="right" />
            <SortHeader label="Debe" sortKey="due" state={sort} onSort={onSort} width={84} align="right" />
          </div>
          {!v.cobrosFull.length &&
            (v.pendQ || v.pendKind !== 'todas' ? (
              <div style={{ padding: '30px 0', fontSize: 13, color: '#6b665c', textAlign: 'center' }}>Ningún cobro coincide</div>
            ) : (
              <Vacio titulo="No hay cobros en el período" detalle="Acá aparecen las cuotas del período: las cobradas, las pagadas a medias y las que todavía no entraron." />
            ))}
          <ScrollArea style={{ padding: '4px 20px' }}>
            {cobros.map((p, i) => (
              <Btn
                key={i}
                onClick={p.open}
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13, width: '100%', padding: '11px 0', border: 'none', background: 'none', borderBottom: '1px solid #f4efe4', textAlign: 'left', color: 'inherit', cursor: 'pointer', font: 'inherit' }}
                hoverStyle={{ background: '#fbf7ee' }}
              >
                <span style={avatar}>{p.initials}</span>
                <span style={{ width: 190, flex: 'none' }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{p.driver}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{p.plate}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#3d3a34' }}>{p.desc}</span>
                <span style={{ width: 74, flex: 'none', fontSize: 12, color: '#6b665c' }}>{p.dateLbl}</span>
                <span style={{ width: 84, flex: 'none' }}>
                  <span style={{ ...tag, background: p.tagBg, color: p.tagFg }}>{p.tag}</span>
                </span>
                <span style={{ width: 122, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, color: p.amt === '—' ? '#6b665c' : '#2e7d5b' }}>{p.amt}</span>
                <span style={{ width: 84, flex: 'none', textAlign: 'right', fontSize: 14, fontWeight: 700, color: p.debeFg }}>{p.debe || '—'}</span>
              </Btn>
            ))}
          </ScrollArea>
        </>
      )}
    </Screen>
  );
}
