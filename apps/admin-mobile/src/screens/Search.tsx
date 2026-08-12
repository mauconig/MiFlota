import type { MobileView } from '../useMobileView';
import { ChipRow } from '../components/ChipRow';

interface SearchRow {
  desc: string;
  sub: string;
  amt: string;
  color: string;
  iconBg: string;
  icon: string;
  open: () => void;
}

function RowList({ rows }: { rows: SearchRow[] }) {
  return (
    <div style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 20, padding: '4px 14px' }}>
      {rows.map((r, i) => (
        <button
          key={i}
          onClick={r.open}
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, padding: '11px 0', border: 'none', borderBottom: '1px solid #f4efe4', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
        >
          <span style={{ width: 34, height: 34, borderRadius: 17, background: r.iconBg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 12, fontWeight: 700 }}>{r.icon}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{r.desc}</span>
            <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{r.sub}</span>
          </span>
          {r.amt && <span style={{ flex: 'none', fontSize: 13, fontWeight: 700, color: r.color }}>{r.amt}</span>}
        </button>
      ))}
    </div>
  );
}

export function Search({ v }: { v: MobileView }) {
  const s = v.search;
  return (
    <main style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {s.emptyState && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Atajos</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {s.shortcuts.map((c, i) => (
                <button key={i} onClick={c.pick} style={{ border: '1px solid ' + c.bd, background: c.bg, color: c.fg, borderRadius: 18, padding: '13px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {s.hasRecents && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Recientes</span>
              <ChipRow chips={s.recents.map((r) => ({ label: r.label, bg: '#fffdf8', fg: '#3d3a34', bd: '#e6ded0', pick: r.pick }))} wrap />
            </div>
          )}
        </div>
      )}

      {s.hasShortcut && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>{s.shortcutTitle}</span>
          {s.shortcutEmpty ? <div style={{ fontSize: 13, color: '#6b665c', padding: '4px 6px' }}>Nada pendiente acá. Buena señal.</div> : <RowList rows={s.shortcutRows} />}
        </div>
      )}

      {s.hasResCars && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Autos</span>
          <RowList rows={s.resCars} />
        </div>
      )}

      {s.hasResDrivers && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Choferes</span>
          <RowList rows={s.resDrivers} />
        </div>
      )}

      {s.hasResMovs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c', paddingLeft: 4 }}>Movimientos</span>
          <RowList rows={s.resMovs} />
        </div>
      )}

      {s.noResults && (
        <div style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 20, padding: '20px 18px', textAlign: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{s.noResTxt}</span>
        </div>
      )}
    </main>
  );
}
