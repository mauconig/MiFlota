import type { Chip } from '../useFleetView';
import type { CSSProperties } from 'react';

export function ChipRow({ chips, size = 'md', wrap = false }: { chips: Chip[]; size?: 'md' | 'sm'; wrap?: boolean }) {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    gap: 7,
    flex: wrap ? undefined : 'none',
    flexWrap: wrap ? 'wrap' : undefined,
    alignItems: 'center',
  };
  const btnStyle = (c: Chip): CSSProperties => ({
    border: `1px solid ${c.bd}`,
    background: c.bg,
    color: c.fg,
    borderRadius: 12,
    minHeight: 34,
    padding: size === 'sm' ? '0 12px' : '0 13px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  });
  return (
    <div style={style}>
      {chips.map((c) => (
        <button key={c.label} onClick={c.pick} style={btnStyle(c)}>
          {c.label}
        </button>
      ))}
    </div>
  );
}
