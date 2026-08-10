import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ColItem, VehicleRow } from '../useFleetView';
import { Btn } from './Btn';
import { BrandIcon } from '../icons';

const RESUMEN_GRID = '1.85fr 1.1fr 0.66fr 0.8fr 0.8fr 1.1fr 0.72fr';
const FLOTA_GRID = '1.7fr 1.1fr 0.66fr 1fr 0.8fr 0.8fr 1.05fr 0.7fr';

export function VehicleTable({ cols, rows, variant, autoFit = false }: { cols: ColItem[]; rows: VehicleRow[]; variant: 'resumen' | 'flota'; autoFit?: boolean }) {
  const grid = variant === 'resumen' ? RESUMEN_GRID : FLOTA_GRID;
  const cellPad = variant === 'resumen' ? '8px 14px' : '11px 12px';

  const wrapRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  // Start small so the row list contributes minimal intrinsic height — otherwise, on
  // the first layout pass, this column's own (unclamped) content would dominate the
  // grid row's auto height instead of stretching to match the sibling column.
  const [visibleCount, setVisibleCount] = useState(autoFit ? 1 : rows.length);

  useLayoutEffect(() => {
    if (!autoFit) return;
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rowH = probeRef.current?.getBoundingClientRect().height;
      const available = el.clientHeight;
      if (!rowH || !available) return;
      const count = Math.max(1, Math.min(rows.length, Math.floor(available / rowH)));
      setVisibleCount((prev) => (prev === count ? prev : count));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoFit, rows.length]);

  const displayRows = autoFit ? rows.slice(0, visibleCount) : rows;
  // Rows grow from their natural height to fill any leftover space evenly, so the
  // fitted rows always span the full container with no dead space at the bottom.
  const rowFlex: CSSProperties['flex'] = autoFit ? '1 0 auto' : 'none';

  const renderRow = (r: VehicleRow) => (
    <Btn
      key={r.id}
      onClick={r.open}
      style={{
        display: 'grid',
        gridTemplateColumns: grid,
        alignItems: 'center',
        width: '100%',
        flex: rowFlex,
        border: 'none',
        borderBottom: '1px solid #f4efe4',
        background: r.rowBg,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        padding: 0,
      }}
      hoverStyle={{ background: '#fbf7ee' }}
    >
      <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 11, padding: cellPad, minWidth: 0 }}>
        <span style={{ width: 34, height: 34, borderRadius: 11, background: '#f4f0e8', color: '#4a463c', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <BrandIcon model={r.rawModel} size={21} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{r.plate}</span>
          <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{r.model}</span>
        </span>
      </span>
      <span style={{ padding: cellPad, fontSize: 13, color: '#3d3a34', minWidth: 0 }}>{r.driver}</span>
      <span style={{ padding: cellPad, fontSize: 13, color: '#3d3a34', textAlign: 'right' }}>{r.cuota}</span>
      {variant === 'flota' && <span style={{ padding: cellPad, fontSize: 12, color: r.svcFg, textAlign: 'left' }}>{r.svc}</span>}
      <span style={{ padding: cellPad, fontSize: 13, fontWeight: 600, color: '#2e7d5b', textAlign: 'right' }}>{r.ing}</span>
      <span style={{ padding: cellPad, fontSize: 13, fontWeight: 600, color: '#c0553f', textAlign: 'right' }}>{r.egr}</span>
      <span style={{ padding: cellPad, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 9 }}>
        <span style={{ width: variant === 'resumen' ? 52 : 44, height: 6, borderRadius: 3, background: '#f0ebe0', overflow: 'hidden', flex: 'none' }}>
          <span style={{ display: 'block', height: '100%', borderRadius: 3, background: r.netColor, width: r.netPct }} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: r.netColor, minWidth: variant === 'resumen' ? 62 : 60, textAlign: 'right' }}>{r.net}</span>
      </span>
      <span style={{ padding: cellPad, textAlign: 'right' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 11, background: r.tagBg, color: r.tagFg }}>{r.tag}</span>
      </span>
    </Btn>
  );

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: grid, background: '#fbf7ee', borderBottom: '1px solid #f0ebe0', flex: 'none' }}>
        {cols.map((c) => (
          <Btn
            key={c.key}
            onClick={c.sort}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: cellPad,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: c.fg,
              textAlign: c.align,
              display: 'block',
            }}
            hoverStyle={{ color: '#16150f' }}
          >
            {c.label}
            {c.arrow}
          </Btn>
        ))}
      </div>
      <div ref={autoFit ? wrapRef : undefined} style={{ display: 'flex', flexDirection: 'column', position: 'relative', ...(autoFit ? { flex: 1, minHeight: 0, overflow: 'hidden' } : {}) }}>
        {autoFit && rows[0] && (
          <div ref={probeRef} aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, visibility: 'hidden', pointerEvents: 'none' }}>
            {renderRow(rows[0])}
          </div>
        )}
        {displayRows.map(renderRow)}
      </div>
    </>
  );
}
