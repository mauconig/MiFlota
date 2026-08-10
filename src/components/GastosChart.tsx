import type { View } from '../useFleetView';
import { Btn } from './Btn';
import { card, linkBtn, linkBtnHover, sectionTitle } from '../styles';

const SHORT_LABEL: Record<string, string> = {
  Taller: 'Taller',
  Combustible: 'Combust.',
  Seguro: 'Seguro',
  Multas: 'Multas',
  Documentación: 'Docum.',
  Otros: 'Otros',
};

const CHART_H = 108;

export function GastosChart({ v }: { v: View }) {
  return (
    <div style={{ ...card, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <span style={{ flex: 1, ...sectionTitle }}>Gastos por categoría</span>
        <Btn onClick={v.goReportes} style={linkBtn} hoverStyle={linkBtnHover}>
          Ver todo →
        </Btn>
      </div>
      <span style={{ fontSize: 11, color: '#6b665c' }}>
        {v.egrTotal} en {v.periodShort}
      </span>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height: CHART_H }}>
        {v.cats.map((c) => {
          const h = Math.max(3, Math.round((parseInt(c.pct, 10) / 100) * CHART_H));
          return (
            <div key={c.label} title={c.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: CHART_H, gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#3d3a34', whiteSpace: 'nowrap' }}>{c.amt}</span>
              <span style={{ width: '70%', maxWidth: 26, height: h, borderRadius: '4px 4px 0 0', background: c.color }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
        {v.cats.map((c) => (
          <span key={c.label} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#6b665c', lineHeight: 1.2 }}>
            {SHORT_LABEL[c.label] ?? c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
