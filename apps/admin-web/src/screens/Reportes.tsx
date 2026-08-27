import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { ChipRow } from '../components/ChipRow';
import { SearchBar } from '../components/SearchBar';
import { Screen, ScrollArea, Vacio } from '../components/Screen';
import { card, sectionTitle } from '../styles';
import { fmtShort } from '../format';

export function Reportes({ v }: { v: View }) {
  return (
    <Screen label="Reportes" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 38%)', gap: 18, minHeight: 0 }}>
      <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={sectionTitle}>Movimientos</div>
            <div style={{ fontSize: 12, color: '#6b665c', marginTop: 2 }}>{v.movsSub}</div>
          </div>
          <Btn onClick={v.exportar} style={{ border: 'none', background: '#16150f', color: '#fffdf8', borderRadius: 12, minHeight: 38, padding: '0 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 'none' }} hoverStyle={{ background: '#2a2820' }}>Exportar Excel</Btn>
        </div>
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0ebe0', flexWrap: 'wrap', flex: 'none' }}>
          <SearchBar value={v.movQ} onChange={v.setMovQ} placeholder="Buscar movimiento…" />
          <ChipRow chips={v.movTypeChips} />
          <span style={{ width: 1, height: 20, background: '#ece4d6', margin: '0 4px' }} />
          <ChipRow chips={v.movCatChips} wrap />
        </div>
        <ScrollArea style={{ display: 'flex', flexDirection: 'column', padding: '4px 20px' }}>
          {!v.movRows.length && <Vacio titulo="Sin movimientos con estos filtros" detalle="Los pagos efectivos y los gastos registrados del período van a aparecer acá." />}
          {v.movRows.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #f4efe4' }}>
              <span style={{ width: 26, flex: 'none', fontSize: 12, color: '#a9a293', textAlign: 'right' }}>{m.pos}</span>
              <span style={{ width: 52, flex: 'none', fontSize: 12, color: '#6b665c' }}>{m.dateLbl}</span>
              <span style={{ width: 34, height: 34, borderRadius: 11, background: m.iconBg, color: m.iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 15, fontWeight: 700 }}>{m.sign}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{m.desc}</span>
                <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{m.sub}</span>
                {!!m.items?.length && <span style={{ display: 'block', marginTop: 7, padding: '7px 9px', background: '#faf7f0', borderRadius: 9, fontSize: 11, color: '#6b665c' }}>{m.items.map((item, j) => <span key={j} style={{ display: 'block' }}>{item.cantidad} × {item.nombre} · {fmtShort(item.subtotal)}</span>)}{!!m.manoObra && <span style={{ display: 'block', marginTop: 3, fontWeight: 600 }}>Mano de obra · {fmtShort(m.manoObra)}</span>}</span>}
              </span>
              <span style={{ flex: 'none', fontSize: 13, fontWeight: 700, color: m.amtFg }}>{m.amt}</span>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div style={{ ...card, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flex: 'none' }}><span style={sectionTitle}>Gastos por categoría</span><span style={{ fontSize: 12, color: '#6b665c' }}>{v.movEgrTotal}</span></div>
        <ScrollArea style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {v.movCats.map((c) => <div key={c.label} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}><span style={{ width: 104, flex: 'none', fontSize: 13, color: '#3d3a34' }}>{c.label}</span><span style={{ flex: 1, height: 10, borderRadius: 5, background: '#f4f0e8', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', borderRadius: 5, background: c.color, width: c.pct }} /></span><span style={{ width: 76, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{c.amt}</span><span style={{ width: 38, flex: 'none', textAlign: 'right', fontSize: 12, color: '#6b665c' }}>{c.share}</span></div>)}
        </ScrollArea>
        <div style={{ borderTop: '1px solid #f0ebe0', paddingTop: 13, display: 'flex', flexDirection: 'column', gap: 9, flex: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#6b665c' }}>Ingresos reales</span><span style={{ fontWeight: 700, color: '#2e7d5b' }}>{v.movIngTotal}</span></div>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#6b665c' }}>Gastos</span><span style={{ fontWeight: 700, color: '#c0553f' }}>{v.movEgrTotal}</span></div>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontSize: 14 }}><span style={{ fontWeight: 700 }}>Resultado neto</span><span style={{ fontWeight: 700 }}>{v.movNetTotal}</span></div>
        </div>
        <div style={{ borderTop: '1px solid #f0ebe0', paddingTop: 13, display: 'flex', flexDirection: 'column', gap: 9, flex: 'none' }}><span style={sectionTitle}>Exportar este período</span><span style={{ fontSize: 12, color: '#6b665c', lineHeight: 1.5 }}>Generá un archivo con pagos recibidos, gastos detallados y el resumen del período.</span><div style={{ display: 'flex', gap: 8, marginTop: 4 }}><Btn onClick={v.exportarPdf} style={{ flex: 1, border: 'none', background: '#16150f', color: '#fffdf8', borderRadius: 12, minHeight: 40, fontSize: 12, fontWeight: 700, cursor: 'pointer' }} hoverStyle={{ background: '#2a2820' }}>PDF</Btn><Btn onClick={v.exportar} style={{ flex: 1, border: '1px solid #e0d6c4', background: '#fffdf8', color: '#3d3a34', borderRadius: 12, minHeight: 40, fontSize: 12, fontWeight: 700, cursor: 'pointer' }} hoverStyle={{ background: '#f7f1e5' }}>Excel</Btn></div></div>
      </div>
    </Screen>
  );
}
