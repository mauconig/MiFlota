import type { MobileView } from '../useMobileView';
import { ChipRow } from './ChipRow';
import { BottomSheet } from './BottomSheet';

export function PeriodoSheet({ v }: { v: MobileView }) {
  const p = v.period;
  return (
    <BottomSheet title="Período" onClose={p.closeSheet}>
      <ChipRow chips={p.chips} wrap />
      <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginTop: 2 }}>
        <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c' }}>Desde</span>
          <input type="date" value={p.cFrom} onChange={(e) => p.setFrom(e.target.value)} style={{ border: '1px solid #e6ded0', borderRadius: 14, padding: '11px 12px', fontSize: 13, color: '#1a1a18', background: '#fffdf8' }} />
        </label>
        <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c' }}>Hasta</span>
          <input type="date" value={p.cTo} onChange={(e) => p.setTo(e.target.value)} style={{ border: '1px solid #e6ded0', borderRadius: 14, padding: '11px 12px', fontSize: 13, color: '#1a1a18', background: '#fffdf8' }} />
        </label>
      </div>
      <button onClick={p.closeSheet} style={{ border: 'none', borderRadius: 18, background: '#16150f', color: '#fffdf8', minHeight: 48, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
        Aplicar
      </button>
    </BottomSheet>
  );
}
