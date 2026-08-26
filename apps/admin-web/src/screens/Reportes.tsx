import type { View } from '../useFleetView';
import { Btn } from '../components/Btn';
import { Screen, ScrollArea } from '../components/Screen';
import { card, sectionTitle } from '../styles';

export function Reportes({ v }: { v: View }) {
  return (
    <Screen label="Reportes" style={{ gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <Kpi title="Ingresos reales" value={v.ingTotal} hint="Pagos recibidos" color="#2e7d5b" />
        <Kpi title="Gastos" value={v.egrTotal} hint="Egresos registrados" color="#c0553f" />
        <Kpi title="Resultado" value={v.netTotal} hint="Ingresos menos gastos" color="#fffdf8" dark />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 370px', gap: 14, minHeight: 0, flex: 1 }}>
        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}><span style={sectionTitle}>Resultado por vehículo</span><span style={{ fontSize: 12, color: '#6b665c' }}>Datos reales del período</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 10, padding: '8px 10px', borderBottom: '1px solid #f0ebe0', color: '#6b665c', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}><span>Vehículo</span><span style={{ textAlign: 'right' }}>Ingresos</span><span style={{ textAlign: 'right' }}>Gastos</span><span style={{ textAlign: 'right' }}>Resultado</span></div>
          <ScrollArea>{v.rows.map((r) => <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 10, alignItems: 'center', padding: '13px 10px', borderBottom: '1px solid #f4efe4' }}><div><div style={{ fontSize: 13, fontWeight: 700 }}>{r.plate}</div><div style={{ fontSize: 11, color: '#6b665c', marginTop: 2 }}>{r.rawModel} · {r.driver}</div></div><span style={{ textAlign: 'right', fontSize: 13, color: '#2e7d5b', fontWeight: 700 }}>{r.ing}</span><span style={{ textAlign: 'right', fontSize: 13, color: '#c0553f', fontWeight: 700 }}>{r.egr}</span><span style={{ textAlign: 'right', fontSize: 13, color: r.netColor, fontWeight: 800 }}>{r.net}</span></div>)}</ScrollArea>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          <div style={{ ...card, padding: 20, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}><span style={sectionTitle}>Gastos por categoría</span><span style={{ fontSize: 12, color: '#6b665c' }}>{v.periodShort}</span></div><ScrollArea style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>{v.cats.map((c) => <div key={c.label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 70px', gap: 10, alignItems: 'center' }}><span style={{ fontSize: 12, color: '#3d3a34' }}>{c.label}</span><span style={{ height: 9, borderRadius: 5, background: '#f4f0e8', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: c.pct, background: c.color, borderRadius: 5 }} /></span><span style={{ textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{c.amt}</span></div>)}</ScrollArea></div>
          <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}><span style={sectionTitle}>Exportar este período</span><span style={{ fontSize: 12, color: '#6b665c', lineHeight: 1.5 }}>Generá un archivo con pagos recibidos, gastos detallados y el resumen por vehículo.</span><div style={{ display: 'flex', gap: 8, marginTop: 4 }}><Btn onClick={v.exportarPdf} style={{ flex: 1, border: 'none', background: '#16150f', color: '#fffdf8', borderRadius: 12, minHeight: 40, fontSize: 12, fontWeight: 700, cursor: 'pointer' }} hoverStyle={{ background: '#2a2820' }}>PDF</Btn><Btn onClick={v.exportar} style={{ flex: 1, border: '1px solid #e0d6c4', background: '#fffdf8', color: '#3d3a34', borderRadius: 12, minHeight: 40, fontSize: 12, fontWeight: 700, cursor: 'pointer' }} hoverStyle={{ background: '#f7f1e5' }}>Excel</Btn></div></div>
        </div>
      </div>
    </Screen>
  );
}

function Kpi({ title, value, hint, color, dark = false }: { title: string; value: string; hint: string; color: string; dark?: boolean }) { return <div style={{ background: dark ? '#16150f' : '#fffdf8', border: dark ? 'none' : '1px solid #ece4d6', borderRadius: 16, padding: '16px 18px' }}><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: dark ? '#bdb6a4' : '#6b665c' }}>{title}</div><div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 7 }}>{value}</div><div style={{ fontSize: 11, color: dark ? '#bdb6a4' : '#6b665c', marginTop: 3 }}>{hint}</div></div>; }
