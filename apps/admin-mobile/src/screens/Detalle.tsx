import type { MobileView } from '../useMobileView';
import { Avatar } from '../components/Avatar';
import { AlertCard } from '../components/AlertCard';
import { MovRow } from '../components/MovRow';

export function Detalle({ v }: { v: MobileView }) {
  const dc = v.detalle;
  if (!dc) return null;
  return (
    <main style={{ padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 22, padding: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <Avatar label={dc.initials} size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{dc.plate}</div>
            <div style={{ fontSize: 12, color: '#6b665c' }}>
              {dc.model} {dc.year}
            </div>
          </div>
          <button
            onClick={dc.openEstadoSheet}
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '5px 8px 5px 10px', borderRadius: 12, border: 'none', background: dc.tagBg, color: dc.tagFg, cursor: 'pointer', flex: 'none' }}
          >
            {dc.estado}
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid #f0ebe0' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b665c' }}>Cobrado</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#2e7d5b', marginTop: 2 }}>{dc.ing}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b665c' }}>Gastos</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#c0553f', marginTop: 2 }}>{dc.egr}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b665c' }}>Neto {v.period.short}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: dc.netColor, marginTop: 2 }}>{dc.net}</div>
          </div>
        </div>
        <button onClick={dc.openChoferSheet} style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: '12px 0 0', border: 'none', borderTop: '1px solid #f0ebe0', background: 'none', color: 'inherit', cursor: 'pointer' }}>
          <span style={{ width: 32, height: 32, borderRadius: 16, background: '#f4f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: '#5f5a51' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{dc.driver}</span>
            <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>cuota diaria {dc.cuotaFmt}</span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#b5791a', flex: 'none' }}>
            {dc.driverAction}
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </button>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button onClick={dc.goCobro} style={{ border: 'none', borderRadius: 18, background: '#16150f', color: '#fffdf8', minHeight: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Cobro
        </button>
        <button onClick={dc.goGasto} style={{ border: '1px solid #e0d6c4', borderRadius: 18, background: '#fffdf8', color: '#1a1a18', minHeight: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
          Gasto
        </button>
      </div>

      {dc.hasAlerts && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Mantenimiento</div>
          {dc.alerts.map((a, i) => (
            <AlertCard key={i} a={a} />
          ))}
        </section>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c' }}>Movimientos</span>
          <span style={{ fontSize: 11, color: '#6b665c' }}>{dc.movCount}</span>
        </div>
        <div style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 20, padding: '4px 14px' }}>
          {dc.noMovs && <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: '#6b665c' }}>Todavía no hay movimientos en este vehículo</div>}
          {dc.movs.map((m) => (
            <MovRow key={m.id} m={m} />
          ))}
        </div>
      </section>
    </main>
  );
}
