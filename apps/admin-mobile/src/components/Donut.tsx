import type { MobileView } from '../useMobileView';

export function Donut({ d }: { d: MobileView['dashboard'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <div style={{ position: 'relative', width: 112, height: 112, flex: 'none' }}>
        <svg viewBox="0 0 42 42" width="112" height="112">
          <g transform="rotate(-90 21 21)">
            {d.donut.map((s, i) => (
              <circle key={i} cx="21" cy="21" r="15.9155" fill="none" stroke={s.color} strokeWidth="5.5" strokeDasharray={s.dash} strokeDashoffset={s.off} strokeLinecap="butt" />
            ))}
          </g>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c' }}>Gastos</span>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>{d.donutTotal}</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {d.donut.length === 0 && <span style={{ fontSize: 12, color: '#6b665c' }}>Sin gastos en el período</span>}
        {d.donut.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: s.color, flex: 'none' }} />
            <span style={{ flex: 1, fontWeight: 500 }}>{s.cat}</span>
            <span style={{ color: '#6b665c', fontWeight: 600 }}>{s.pctTxt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
