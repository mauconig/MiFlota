import { initials } from '../format';

const iconBtnStyle = { width: 40, height: 40, borderRadius: 20, border: '1px solid #e6ded0', background: '#fffdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#3d3a34', flex: 'none' } as const;

export function TabHeader({ title, sub, onSearch, nombre }: { title: string; sub: string; onSearch: () => void; nombre: string }) {
  return (
    <header style={{ padding: '10px 20px 6px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#6b665c', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
      </div>
      <button onClick={onSearch} aria-label="Buscar" style={iconBtnStyle}>
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
      </button>
      <button aria-label="Perfil" style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: '#16150f', color: '#f7dfae', fontSize: 14, fontWeight: 700, cursor: 'pointer', flex: 'none' }}>
        {initials(nombre)}
      </button>
    </header>
  );
}

export function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header style={{ padding: '8px 14px 4px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <button onClick={onBack} aria-label="Volver" style={iconBtnStyle}>
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </svg>
      </button>
      <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</span>
    </header>
  );
}

export function SearchHeader({ q, onQ, onClear, onBack }: { q: string; onQ: (v: string) => void; onClear: () => void; onBack: () => void }) {
  return (
    <header style={{ padding: '8px 14px 4px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <button onClick={onBack} aria-label="Volver" style={iconBtnStyle}>
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </svg>
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 9, background: '#fffdf8', border: '1px solid #e6ded0', borderRadius: 22, padding: '0 14px', minHeight: 44 }}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#6b665c" strokeWidth="1.8" strokeLinecap="round" style={{ flex: 'none' }}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Patente, chofer, gasto o monto"
          autoFocus
          style={{ flex: 1, border: 'none', background: 'none', fontSize: 14, color: '#1a1a18', minWidth: 0, outline: 'none' }}
        />
        {q && (
          <button onClick={onClear} aria-label="Limpiar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b665c', flex: 'none', padding: 4 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
