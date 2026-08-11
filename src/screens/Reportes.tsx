import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { ChipRow } from '../components/ChipRow';
import { SearchBar } from '../components/SearchBar';
import { Screen, ScrollArea } from '../components/Screen';
import { card, sectionTitle } from '../styles';

export function Reportes({ v }: { v: View }) {
  return (
    <Screen label="Reportes" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 18 }}>
      <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={sectionTitle}>Movimientos</div>
            <div style={{ fontSize: 12, color: '#6b665c', marginTop: 2 }}>{v.movsSub}</div>
          </div>
          <Btn
            onClick={v.exportar}
            style={{ border: 'none', background: '#16150f', color: '#fffdf8', borderRadius: 12, minHeight: 38, padding: '0 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 'none' }}
            hoverStyle={{ background: '#2a2820' }}
          >
            Exportar CSV
          </Btn>
        </div>
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0ebe0', flexWrap: 'wrap', flex: 'none' }}>
          <SearchBar value={v.movQ} onChange={v.setMovQ} placeholder="Buscar movimiento…" />
          <ChipRow chips={v.movTypeChips} />
          <span style={{ width: 1, height: 20, background: '#ece4d6', margin: '0 4px' }} />
          <ChipRow chips={v.movCatChips} wrap />
        </div>
        <ScrollArea style={{ display: 'flex', flexDirection: 'column', padding: '4px 20px' }}>
          {!v.movRows.length && <div style={{ padding: '30px 0', fontSize: 13, color: '#6b665c', textAlign: 'center' }}>Sin movimientos con estos filtros</div>}
          {v.movRows.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #f4efe4' }}>
              <span style={{ width: 52, flex: 'none', fontSize: 12, color: '#6b665c' }}>{m.dateLbl}</span>
              <span style={{ width: 34, height: 34, borderRadius: 11, background: m.iconBg, color: m.iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 15, fontWeight: 700 }}>
                {m.sign}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{m.desc}</span>
                <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{m.sub}</span>
              </span>
              <span style={{ flex: 'none', fontSize: 13, fontWeight: 700, color: m.amtFg }}>{m.amt}</span>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div style={{ ...card, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flex: 'none' }}>
          <span style={sectionTitle}>Gastos por categoría</span>
          <span style={{ fontSize: 12, color: '#6b665c' }}>{v.movEgrTotal}</span>
        </div>
        <ScrollArea style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {v.movCats.map((c) => (
            <div key={c.label} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 104, flex: 'none', fontSize: 13, color: '#3d3a34' }}>{c.label}</span>
              <span style={{ flex: 1, height: 10, borderRadius: 5, background: '#f4f0e8', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', borderRadius: 5, background: c.color, width: c.pct }} />
              </span>
              <span style={{ width: 76, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{c.amt}</span>
              <span style={{ width: 38, flex: 'none', textAlign: 'right', fontSize: 12, color: '#6b665c' }}>{c.share}</span>
            </div>
          ))}
        </ScrollArea>
        <div style={{ borderTop: '1px solid #f0ebe0', paddingTop: 13, display: 'flex', flexDirection: 'column', gap: 9, flex: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#6b665c' }}>Ingresos</span>
            <span style={{ fontWeight: 700, color: '#2e7d5b' }}>{v.movIngTotal}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#6b665c' }}>Egresos</span>
            <span style={{ fontWeight: 700, color: '#c0553f' }}>{v.movEgrTotal}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ fontWeight: 700 }}>Ganancia neta</span>
            <span style={{ fontWeight: 700 }}>{v.movNetTotal}</span>
          </div>
        </div>
      </div>
    </Screen>
  );
}
