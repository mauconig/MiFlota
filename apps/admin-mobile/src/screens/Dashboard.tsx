import type { MobileView } from '../useMobileView';
import { Sparkline } from '../components/Sparkline';
import { Donut } from '../components/Donut';
import { BarList } from '../components/BarList';
import { HealthCard } from '../components/HealthCard';

const card = { background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 20, padding: 16 };

export function Dashboard({ v }: { v: MobileView }) {
  const d = v.dashboard;
  return (
    <main style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{ padding: '2px 4px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b665c' }}>Ganancia neta · {v.period.label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, marginTop: 2 }}>
          <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, whiteSpace: 'nowrap', flex: 'none', color: d.heroColor }}>{d.heroNet}</span>
          <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flex: 'none', color: d.heroNet.startsWith('−') ? '#c0553f' : '#2e7d5b' }}>{d.deltaTxt}</span>
        </div>
        <Sparkline d={d} />
      </section>

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
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#6b665c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={card}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c' }}>Cobrado · {v.period.short}</div>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>{d.heroIng}</div>
          <div style={{ height: 4, borderRadius: 2, background: '#2e7d5b', marginTop: 10 }} />
        </div>
        <div style={card}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c' }}>Gastos · {v.period.short}</div>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>{d.heroEgr}</div>
          <div style={{ height: 4, borderRadius: 2, background: '#e8a13a', marginTop: 10, width: d.egrBarW + '%' }} />
        </div>
      </div>

      <section style={card}>
        <Donut d={d} />
      </section>

      <section style={card}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Neto por auto</span>
          <button onClick={v.navRanking} style={{ border: 'none', background: 'none', font: 'inherit', fontSize: 12, fontWeight: 600, color: '#b5791a', cursor: 'pointer' }}>
            Ver ranking →
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          {d.bars.length === 0 ? <span style={{ fontSize: 12, color: '#6b665c' }}>Sin vehículos activos todavía</span> : <BarList bars={d.bars.map((b) => ({ label: b.plate, w: b.w, color: b.color, short: b.short }))} />}
        </div>
      </section>

      <HealthCard d={d} />
    </main>
  );
}
