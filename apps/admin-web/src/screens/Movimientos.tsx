import type { View, LedgerRow } from '../useFleetView';
import { Btn } from '../components/Btn';
import { ChipRow } from '../components/ChipRow';
import { SearchBar } from '../components/SearchBar';
import { Screen, ScrollArea, Vacio } from '../components/Screen';
import { card, sectionTitle } from '../styles';
import { fmtShort } from '../format';

export function Movimientos({ v }: { v: View }) {
  return (
    <Screen label="Movimientos" style={{ display: 'grid', gridTemplateColumns: '250px minmax(0, 1fr)', gap: 14 }}>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ padding: '17px 18px 12px', borderBottom: '1px solid #f0ebe0' }}>
          <div style={sectionTitle}>Historial</div>
          <div style={{ fontSize: 12, color: '#6b665c', marginTop: 3 }}>Elegí un mes para ver qué entró y qué salió.</div>
        </div>
        <ScrollArea style={{ padding: '8px' }}>
          {v.movementMonths.map((month, index) => (
            <div key={month.key}>
              {(index === 0 || v.movementMonths[index - 1].year !== month.year) && <div style={{ padding: '10px 10px 5px', fontSize: 10, fontWeight: 800, color: '#8d887d', letterSpacing: '0.08em' }}>{month.year}</div>}
              <button
                type="button"
                onClick={month.select}
                style={{
                width: '100%',
                border: month.active ? '1px solid #e8a13a' : '1px solid transparent',
                background: month.active ? '#fdf6e8' : 'transparent',
                borderRadius: 13,
                padding: '11px 10px',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#1a1a18',
                font: 'inherit',
                }}
              >
              <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{month.label}</span>
                <span style={{ fontSize: 11, color: '#8d887d' }}>{month.count}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'row', gap: 8, marginTop: 7, fontSize: 10, color: '#6b665c' }}>
                <span style={{ color: '#2e7d5b' }}>+{month.income}</span>
                <span style={{ color: '#c0553f' }}>−{month.expense}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700 }}>Neto {month.net}</span>
              </span>
              </button>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ padding: '17px 20px 14px', borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <div style={{ ...sectionTitle, textTransform: 'capitalize' }}>{v.movementMonths.find((m) => m.key === v.movementMonth)?.label}</div>
            <span style={{ fontSize: 12, color: '#6b665c' }}>{v.movementTotalRows} movimientos encontrados</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13, flexWrap: 'wrap' }}>
            <SearchBar value={v.movQ} onChange={v.setMovQ} placeholder="Buscar movimiento…" />
            <div className="chip-scroll"><ChipRow chips={v.movementVehicleChips} /></div>
            <div className="chip-scroll"><ChipRow chips={v.movementTypeChips} /></div>
            <div className="chip-scroll"><ChipRow chips={v.movementCategoryChips} /></div>
          </div>
        </div>

        <ScrollArea style={{ padding: '4px 20px' }}>
          {!v.movementRows.length ? (
            <Vacio titulo="No hay movimientos en este mes" detalle="Probá elegir otro mes o cambiar los filtros." />
          ) : (
            v.movementRows.map((row) => <LedgerItem key={row.id} row={row} expanded={v.movementExpandedId === row.id} onToggle={() => v.movementOpenRow(row.id)} />)
          )}
        </ScrollArea>

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 20px', borderTop: '1px solid #f0ebe0', flex: 'none' }}>
          <span style={{ fontSize: 12, color: '#6b665c' }}>Página {v.movementPage} de {v.movementPageCount}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={v.movementPrevPage} disabled={v.movementPage <= 1} style={{ border: '1px solid #e0d6c4', background: '#fffdf8', borderRadius: 11, minHeight: 34, padding: '0 12px', fontSize: 12, fontWeight: 700, color: '#3d3a34', cursor: 'pointer' }} disabledStyle={{ color: '#bdb6a4', cursor: 'default' }}>Anterior</Btn>
            <Btn onClick={v.movementNextPage} disabled={v.movementPage >= v.movementPageCount} style={{ border: '1px solid #e0d6c4', background: '#fffdf8', borderRadius: 11, minHeight: 34, padding: '0 12px', fontSize: 12, fontWeight: 700, color: '#3d3a34', cursor: 'pointer' }} disabledStyle={{ color: '#bdb6a4', cursor: 'default' }}>Siguiente</Btn>
          </span>
        </div>
      </div>
    </Screen>
  );
}

function LedgerItem({ row, expanded, onToggle }: { row: LedgerRow; expanded: boolean; onToggle: () => void }) {
  const hasDetails = Boolean(row.note || row.medio || row.comprobante || row.items.length || row.manoObra);
  return (
    <div style={{ borderBottom: '1px solid #f4efe4' }}>
      <button type="button" onClick={hasDetails ? onToggle : undefined} style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, padding: '12px 0', border: 'none', background: 'none', textAlign: 'left', color: 'inherit', cursor: hasDetails ? 'pointer' : 'default', font: 'inherit' }}>
        <span style={{ width: 36, height: 36, borderRadius: 12, background: row.type === 'ingreso' ? '#eef4f0' : '#fdeeea', color: row.amountFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 16, fontWeight: 800 }}>{row.type === 'ingreso' ? '↓' : '↑'}</span>
        <span style={{ width: 62, flex: 'none', fontSize: 12, color: '#6b665c' }}>{row.dateLbl}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.desc}</span>
          <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.vehicle} · {row.driver} · {row.category}</span>
        </span>
        <span style={{ flex: 'none', fontSize: 14, fontWeight: 800, color: row.amountFg }}>{row.amount}</span>
        {hasDetails && <span style={{ width: 18, flex: 'none', color: '#a09a8d', fontSize: 14 }}>{expanded ? '⌃' : '⌄'}</span>}
      </button>
      {expanded && <div style={{ margin: '0 0 12px 48px', padding: '11px 13px', borderRadius: 12, background: '#faf7f0', fontSize: 12, color: '#6b665c' }}>
        {row.medio && <div><strong>Medio:</strong> {row.medio}</div>}
        {row.note && <div><strong>Nota:</strong> {row.note}</div>}
        {row.items.map((item, i) => <div key={i}>{item.cantidad} × {item.nombre} · {fmtShort(item.costoUnitario)} c/u · {fmtShort(item.subtotal)}</div>)}
        {!!row.manoObra && <div><strong>Mano de obra:</strong> {fmtShort(row.manoObra)}</div>}
        {row.comprobante && <a href={row.comprobante} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 5, fontWeight: 700 }}>Ver comprobante</a>}
      </div>}
    </div>
  );
}
