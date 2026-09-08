import type { CSSProperties } from 'react';
import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { ChipRow } from '../components/ChipRow';
import { SearchBar } from '../components/SearchBar';
import { Screen, ScrollArea, Vacio } from '../components/Screen';
import { card, sectionTitle } from '../styles';
import { CATCOLORS } from '../data';

const th: CSSProperties = {
  padding: '8px 20px',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 13,
  borderBottom: '1px solid #f0ebe0',
  flex: 'none',
  minWidth: 700,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#6b665c',
};

const row: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 13,
  minWidth: 700,
  padding: '12px 0',
  borderBottom: '1px solid #f4efe4',
};

export function Gastos({ v }: { v: View }) {
  const filtrados = Boolean(v.gastosQ.trim() || v.gastosCat !== 'todas');
  return (
    <Screen label="Gastos" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 38%)', gap: 18, minHeight: 0 }}>
      <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0ebe0', flex: 'none', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={sectionTitle}>Gastos</div>
            <div style={{ fontSize: 12, color: '#6b665c', marginTop: 2 }}>{v.gastosSub}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
            <Btn onClick={v.exportarGastosPdf} style={{ border: 'none', background: '#16150f', color: '#fffdf8', borderRadius: 12, minHeight: 34, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} hoverStyle={{ background: '#2a2820' }}>PDF</Btn>
            <Btn onClick={v.exportarGastos} style={{ border: '1px solid #e0d6c4', background: '#fffdf8', color: '#3d3a34', borderRadius: 12, minHeight: 34, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} hoverStyle={{ background: '#f7f1e5' }}>Excel</Btn>
          </div>
        </div>

        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, borderBottom: '1px solid #f0ebe0', flexWrap: 'wrap', flex: 'none' }}>
          <SearchBar value={v.gastosQ} onChange={v.setGastosQ} placeholder="Buscar gasto, chofer o chapa…" />
          <span style={{ width: 1, height: 20, background: '#ece4d6', margin: '0 4px' }} />
          <ChipRow chips={v.gastosCatChips} wrap />
        </div>

        <ScrollArea style={{ overflowX: 'auto', padding: '0 20px' }}>
          <div style={th}>
            <span style={{ width: 74, flex: 'none', textAlign: 'center' }}>Fecha</span>
            <span style={{ width: 178, flex: 'none', textAlign: 'center' }}>Vehículo</span>
            <span style={{ width: 174, flex: 'none', textAlign: 'center' }}>Chofer</span>
            <span style={{ flex: 1, minWidth: 210 }}>Detalle</span>
            <span style={{ width: 116, flex: 'none', textAlign: 'center' }}>Categoría</span>
            <span style={{ width: 112, flex: 'none', textAlign: 'center' }}>Monto</span>
          </div>
          {!v.gastosRows.length && <Vacio titulo={filtrados ? 'Ningún gasto coincide' : 'No hay gastos en el período'} detalle={filtrados ? 'Probá con otra búsqueda o categoría.' : 'Los gastos registrados de la flota van a aparecer acá.'} />}
          {v.gastosRows.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={m.open}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && m.open) { e.preventDefault(); m.open(); } }}
              aria-label={'Ver detalle del gasto ' + m.desc}
              style={{ ...row, cursor: m.open ? 'pointer' : 'default' }}
            >
              <span style={{ width: 74, flex: 'none', fontSize: 12, color: '#6b665c', paddingTop: 9, textAlign: 'center' }}>{m.dateLbl}</span>
              <span style={{ width: 178, flex: 'none', fontSize: 12, color: '#3d3a34', paddingTop: 8, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.vehicle}</span>
              <span style={{ width: 174, flex: 'none', fontSize: 13, fontWeight: 700, paddingTop: 7, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.driver}</span>
              <span style={{ flex: 1, minWidth: 210 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3d3a34' }}>{m.desc}</span>
                {!!m.items.length && <span style={{ display: 'block', marginTop: 6, padding: '6px 8px', background: '#faf7f0', borderRadius: 8, fontSize: 11, color: '#6b665c' }}>{m.items.map((item, i) => <span key={i} style={{ display: 'block' }}>{item.cantidad} × {item.nombre}</span>)}{!!m.manoObra && <span style={{ display: 'block', marginTop: 2 }}>Mano de obra · registrada</span>}</span>}
                {m.comprobante && <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, color: '#8a641c' }}>Tiene comprobante</span>}
              </span>
              <span style={{ width: 116, flex: 'none', paddingTop: 5, textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '5px 9px', borderRadius: 11, background: `${CATCOLORS[m.category] || '#f4f0e8'}22`, color: CATCOLORS[m.category] || '#6b665c', fontSize: 10, fontWeight: 700 }}>{m.category}</span></span>
              <span style={{ width: 112, flex: 'none', textAlign: 'center', paddingTop: 7, fontSize: 14, fontWeight: 700, color: '#c0553f' }}>{m.amount}</span>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div style={{ ...card, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flex: 'none' }}>
          <span style={sectionTitle}>Gastos por categoría</span>
          <span style={{ fontSize: 12, color: '#6b665c' }}>{v.gastosTotal}</span>
        </div>
        <ScrollArea style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {v.gastosCats.map((c) => <div key={c.label} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}><span style={{ width: 104, flex: 'none', fontSize: 13, color: '#3d3a34' }}>{c.label}</span><span style={{ flex: 1, height: 10, borderRadius: 5, background: '#f4f0e8', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', borderRadius: 5, background: c.color, width: c.pct }} /></span><span style={{ width: 76, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{c.amt}</span><span style={{ width: 38, flex: 'none', textAlign: 'right', fontSize: 12, color: '#6b665c' }}>{c.share}</span></div>)}
        </ScrollArea>
        <div style={{ borderTop: '1px solid #f0ebe0', paddingTop: 13, display: 'flex', flexDirection: 'column', gap: 9, flex: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#6b665c' }}>Registros</span><span style={{ fontWeight: 700 }}>{v.gastosTotalRows}</span></div>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontSize: 15 }}><span style={{ fontWeight: 700 }}>Total gastos</span><span style={{ fontWeight: 700, color: '#c0553f' }}>{v.gastosTotal}</span></div>
        </div>
      </div>
    </Screen>
  );
}
