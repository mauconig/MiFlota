import type { View } from '../useFleetView';
import { ChipRow } from '../components/ChipRow';
import { SearchBar } from '../components/SearchBar';
import { Screen, ScrollArea, Vacio } from '../components/Screen';
import { card } from '../styles';

export function Cobros({ v }: { v: View }) {
  if (!v.cobrosFull.length && !v.pendQ && v.pendKind === 'todas')
    return (
      <Screen label="Cobros" style={{ ...card, overflow: 'hidden' }}>
        <Vacio titulo="No hay cobros en el período" detalle="Acá aparecen las cuotas del período: las cobradas, las pagadas a medias y las que todavía no entraron." />
      </Screen>
    );

  return (
    <Screen label="Cobros" style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap', borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
        <SearchBar value={v.pendQ} onChange={v.setPendQ} placeholder="Buscar chofer o chapa…" />
        <ChipRow chips={v.pendKindChips} />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b665c' }}>{v.cobrosSub}</span>
      </div>
      {/* Encabezado: sin él, dos montos seguidos en la misma fila no dicen cuál
          es cuál. Los anchos van pegados a los de las filas de abajo. */}
      <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13, borderBottom: '1px solid #f0ebe0', flex: 'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b665c' }}>
        <span style={{ width: 36, flex: 'none' }} />
        <span style={{ width: 190, flex: 'none' }}>Chofer</span>
        <span style={{ flex: 1, minWidth: 0 }}>Concepto</span>
        <span style={{ width: 74, flex: 'none' }}>Fecha</span>
        <span style={{ width: 84, flex: 'none' }}>Estado</span>
        <span style={{ width: 122, flex: 'none', textAlign: 'right' }}>Cobrado</span>
        <span style={{ width: 84, flex: 'none', textAlign: 'right' }}>Debe</span>
      </div>
      {!v.cobrosFull.length && <div style={{ padding: '30px 0', fontSize: 13, color: '#6b665c', textAlign: 'center' }}>Ningún cobro coincide</div>}
      <ScrollArea style={{ padding: '4px 20px' }}>
        {v.cobrosFull.map((p, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13, padding: '11px 0', borderBottom: '1px solid #f4efe4' }}>
            <span style={{ width: 36, height: 36, borderRadius: 18, background: '#f4f0e8', color: '#5f5a51', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>
              {p.initials}
            </span>
            <span style={{ width: 190, flex: 'none' }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{p.driver}</span>
              <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{p.plate}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#3d3a34' }}>{p.desc}</span>
            <span style={{ width: 74, flex: 'none', fontSize: 12, color: '#6b665c' }}>{p.dateLbl}</span>
            <span style={{ width: 84, flex: 'none' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 11, background: p.tagBg, color: p.tagFg }}>{p.tag}</span>
            </span>
            <span style={{ width: 122, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#2e7d5b' }}>{p.amt}</span>
            <span style={{ width: 84, flex: 'none', textAlign: 'right', fontSize: 14, fontWeight: 700, color: p.debeFg }}>{p.debe || '—'}</span>
          </div>
        ))}
      </ScrollArea>
    </Screen>
  );
}
