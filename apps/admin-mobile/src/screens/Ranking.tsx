import type { MobileView } from '../useMobileView';
import { Avatar } from '../components/Avatar';

export function Ranking({ v }: { v: MobileView }) {
  const rk = v.ranking;
  const seg = (on: boolean) => ({ background: on ? '#16150f' : 'transparent', color: on ? '#fffdf8' : '#6b665c' });
  return (
    <main style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', padding: '2px 0' }}>
        <button onClick={v.period.openSheet} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 9, background: '#fffdf8', border: '1px solid #e6ded0', borderRadius: 24, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#1a1a18', cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6b665c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M8 3v4" />
            <path d="M16 3v4" />
            <path d="M3 11h18" />
          </svg>
          {v.period.label}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', background: '#fffdf8', border: '1px solid #e6ded0', borderRadius: 24, padding: 4, gap: 2 }}>
        <button onClick={rk.setAuto} style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 20, padding: '9px 0', fontSize: 13, fontWeight: 600, ...seg(rk.byAuto) }}>
          Por auto
        </button>
        <button onClick={rk.setModelo} style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 20, padding: '9px 0', fontSize: 13, fontWeight: 600, ...seg(!rk.byAuto) }}>
          Por modelo
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#6b665c', paddingLeft: 6 }}>{rk.hint}</div>
      {rk.rows.map((r, i) => (
        <button
          key={i}
          onClick={r.open}
          style={{ background: i === 0 ? '#fdf6e8' : '#fffdf8', border: '1px solid ' + (i === 0 ? '#f2e4c6' : '#ece4d6'), borderRadius: 20, padding: '12px 15px', display: 'grid', gridTemplateColumns: '28px 34px 1fr 84px', alignItems: 'center', gap: 11, width: '100%', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, color: r.posColor }}>{r.pos}</span>
          <Avatar label={r.initials} size={34} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{r.name}</span>
            <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</span>
            <span style={{ display: 'block', height: 6, borderRadius: 3, background: '#f0ebe0', position: 'relative', marginTop: 6 }}>
              <span style={{ position: 'absolute', inset: '0 auto 0 0', width: r.w + '%', borderRadius: 3, background: r.color }} />
            </span>
          </span>
          <span style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: r.color }}>{r.net}</span>
        </button>
      ))}
    </main>
  );
}
