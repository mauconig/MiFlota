import type { MobileView } from '../useMobileView';
import { BarList } from '../components/BarList';

export function Reportes({ v }: { v: MobileView }) {
  const rep = v.reportes;
  return (
    <main style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', padding: '2px 0' }}>
        <button onClick={v.period.openSheet} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 9, background: '#fffdf8', border: '1px solid #e6ded0', borderRadius: 24, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#1a1a18', cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6b665c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M8 3v4" />
            <path d="M16 3v4" />
            <path d="M3 11h18" />
          </svg>
          {v.period.label}
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6b665c' }}>{v.period.days}</span>
        </button>
      </div>
      <section style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 22, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c' }}>{v.period.label}</div>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4, color: rep.netColor }}>{rep.net}</div>
        <div style={{ fontSize: 12, color: '#6b665c' }}>neto · {rep.nMovs} movimientos</div>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, background: '#f4f0e8', borderRadius: 16, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b665c' }}>Cobrado</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#2e7d5b', marginTop: 2 }}>{rep.ing}</div>
          </div>
          <div style={{ flex: 1, background: '#f4f0e8', borderRadius: 16, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b665c' }}>Gastos</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#c0553f', marginTop: 2 }}>{rep.egr}</div>
          </div>
        </div>
      </section>
      <section style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 22, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Gastos por categoría</div>
        <div style={{ marginTop: 14 }}>
          {rep.cats.length === 0 ? <span style={{ fontSize: 12, color: '#6b665c' }}>Sin gastos en el período</span> : <BarList bars={rep.cats.map((c) => ({ label: c.cat, w: c.w, color: c.color, short: c.short }))} labelWidth={96} />}
        </div>
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={rep.exportPdf} style={{ border: 'none', borderRadius: 18, background: '#16150f', color: '#fffdf8', minHeight: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          PDF
        </button>
        <button onClick={rep.exportXls} style={{ border: '1px solid #e0d6c4', borderRadius: 18, background: '#fffdf8', color: '#1a1a18', minHeight: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Excel
        </button>
      </div>
    </main>
  );
}
