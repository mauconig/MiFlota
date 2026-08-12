import type { MobileView } from '../useMobileView';

export function HealthCard({ d }: { d: MobileView['dashboard'] }) {
  return (
    <section style={{ background: '#16150f', borderRadius: 20, padding: '16px 18px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 52, height: 52, borderRadius: 26, border: '2.5px solid #e8a13a', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: '#f7dfae', fontSize: 17, fontWeight: 700 }}>{d.health}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a09884' }}>Salud de la flota</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fffdf8', marginTop: 2 }}>{d.healthLbl}</div>
        <div style={{ fontSize: 12, color: '#bdb6a4', marginTop: 1 }}>{d.healthSub}</div>
      </div>
    </section>
  );
}
