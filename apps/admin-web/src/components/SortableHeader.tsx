import type { CSSProperties } from 'react';

export type SortState = { key: string; direction: 1 | -1 };

export function compareSortableRows(a: { sort?: Record<string, string | number> }, b: { sort?: Record<string, string | number> }, state: SortState) {
  const av = a.sort?.[state.key] ?? '';
  const bv = b.sort?.[state.key] ?? '';
  if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * state.direction;
  return String(av).localeCompare(String(bv), 'es', { numeric: true, sensitivity: 'base' }) * state.direction;
}

export function SortableHeader({ label, sortKey, state, onSort, width, grow = false, align = 'left' }: { label: string; sortKey: string; state: SortState; onSort: (key: string) => void; width?: number; grow?: boolean; align?: 'left' | 'right' }) {
  const active = state.key === sortKey;
  const buttonStyle: CSSProperties = { width, flex: grow ? 1 : 'none', minWidth: grow ? 0 : undefined, display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: 5, padding: 0, border: 'none', background: 'none', color: active ? '#8a641c' : '#6b665c', font: 'inherit', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', textAlign: align };
  return (
    <button type="button" onClick={() => onSort(sortKey)} aria-label={'Ordenar por ' + label} aria-sort={active ? (state.direction === 1 ? 'ascending' : 'descending') : 'none'} style={buttonStyle}>
      <span>{label}</span>
      <span aria-hidden="true" style={{ width: 9, height: 13, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
        <span style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: `5px solid ${active && state.direction === 1 ? '#e8a13a' : '#bdb6a4'}` }} />
        <span style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${active && state.direction === -1 ? '#e8a13a' : '#bdb6a4'}` }} />
      </span>
    </button>
  );
}
