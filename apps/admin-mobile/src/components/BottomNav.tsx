import type { MobileView } from '../useMobileView';

export function BottomNav({ v }: { v: MobileView }) {
  const c = v.tabActive;
  const color = (on: boolean) => (on ? '#16150f' : '#6b665c');
  return (
    <nav style={{ background: '#fffdf8', borderTop: '1px solid #ece4d6', display: 'grid', gridTemplateColumns: '1fr 1fr 72px 1fr 1fr', alignItems: 'center', padding: '8px 6px 14px' }}>
      <button onClick={v.navDash} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0', minHeight: 48, color: color(c.dash) }}>
        <svg viewBox="0 0 24 24" width="21" height="21" fill={c.dash ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: 600 }}>Inicio</span>
      </button>
      <button onClick={v.navFlota} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0', minHeight: 48, color: color(c.flota) }}>
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H8.5c-.6 0-1.2.3-1.6.8L4.5 10.6c-.9.2-1.5 1-1.5 1.9v3.5c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: 600 }}>Flota</span>
      </button>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => v.goRegistrarCobro()}
          aria-label="Registrar"
          style={{ width: 56, height: 56, borderRadius: 28, border: 'none', background: '#e8a13a', color: '#16150f', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(232,161,58,0.42)' }}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
        </button>
      </div>
      <button onClick={v.navRanking} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0', minHeight: 48, color: color(c.ranking) }}>
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20H2" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: 600 }}>Ranking</span>
      </button>
      <button onClick={v.navReportes} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0', minHeight: 48, color: color(c.reportes) }}>
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: 600 }}>Reportes</span>
      </button>
    </nav>
  );
}
