import type { MobileView } from '../useMobileView';

export function Sparkline({ d }: { d: MobileView['dashboard'] }) {
  return (
    <>
      <svg viewBox="0 0 340 96" style={{ width: '100%', height: 96, marginTop: 6, overflow: 'visible' }}>
        <defs>
          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e8a13a" stopOpacity="0.28" />
            <stop offset="1" stopColor="#e8a13a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={d.areaPoints} fill="url(#tg)" />
        <polyline points={d.linePoints} fill="none" stroke="#e8a13a" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={d.lastPt.x} cy={d.lastPt.y} r="4" fill="#fffdf8" stroke="#e8a13a" strokeWidth="2.4" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', padding: '0 2px' }}>
        {d.trendPts.map((p, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#6b665c' }}>
            {p.lbl}
          </span>
        ))}
      </div>
    </>
  );
}
