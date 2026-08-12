import type { MobileView } from '../../useMobileView';
import { MoneyDisplay } from '../../components/MoneyDisplay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { CobroTab } from './CobroTab';
import { GastoTab } from './GastoTab';

export function Registrar({ v }: { v: MobileView }) {
  const r = v.registrar;
  if (!r) return null;
  const seg = (on: boolean) => ({ background: on ? '#16150f' : 'transparent', color: on ? '#fffdf8' : '#6b665c' });
  return (
    <main style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'row', background: '#fffdf8', border: '1px solid #e6ded0', borderRadius: 24, padding: 4, gap: 2 }}>
        <button onClick={() => r.setTab('cobro')} style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 20, padding: '9px 0', fontSize: 13, fontWeight: 700, ...seg(r.tab === 'cobro') }}>
          Cobro
        </button>
        <button onClick={() => r.setTab('gasto')} style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 20, padding: '9px 0', fontSize: 13, fontWeight: 700, ...seg(r.tab === 'gasto') }}>
          Gasto
        </button>
      </div>

      <MoneyDisplay display={r.amountDisplay} color={r.amountColor} hint={r.amountHint} />

      {r.tab === 'cobro' && r.cobro && <CobroTab r={r.cobro} />}
      {r.tab === 'gasto' && r.gasto && <GastoTab r={r.gasto} />}

      <div style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 20, padding: '2px 14px' }}>
        <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid #f4efe4' }}>
          <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, width: 70 }}>Fecha</span>
          <input type="date" value={r.fecha} max={r.hoy} onChange={(e) => r.setFecha(e.target.value)} style={{ flex: 1, border: 'none', background: 'none', textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: '2px 0' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '11px 0' }}>
          <span style={{ flex: 'none', fontSize: 13, fontWeight: 600, width: 70 }}>Nota</span>
          <input placeholder={r.notaPh} value={r.nota} onChange={(e) => r.setNota(e.target.value)} style={{ flex: 1, border: 'none', background: 'none', textAlign: 'right', fontSize: 13, color: '#3d3a34', padding: '2px 0' }} />
        </label>
      </div>

      <NumericKeypad keys={r.keys} />

      <button onClick={r.submit} disabled={r.guardando} style={{ border: 'none', borderRadius: 20, background: r.cta.bg, color: r.cta.fg, minHeight: 52, fontSize: 15, fontWeight: 700, cursor: r.guardando ? 'progress' : 'pointer', opacity: r.guardando ? 0.7 : 1 }}>
        {r.guardando ? 'Guardando…' : r.cta.label}
      </button>
    </main>
  );
}
