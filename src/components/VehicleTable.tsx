import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ColItem, VehicleRow } from '../useFleetView';
import { Btn } from './Btn';
import { BrandIcon } from '../icons';

const RESUMEN_GRID = '1.85fr 1.1fr 0.66fr 0.8fr 0.8fr 1.1fr 0.72fr';
const FLOTA_GRID = '1.7fr 1.1fr 0.66fr 1fr 0.8fr 0.8fr 1.05fr 0.7fr';

/**
 * `fit`    — recorta las filas a las que entran y las estira para llenar exacto.
 *            Para vistas de resumen que tienen un "Ver todo →" al lado.
 * `scroll` — muestra todas las filas y scrollea dentro de la tarjeta, con el
 *            encabezado de columnas fijo. Para vistas que son la lista completa.
 */
export function VehicleTable({ cols, rows, variant, mode }: { cols: ColItem[]; rows: VehicleRow[]; variant: 'resumen' | 'flota'; mode: 'fit' | 'scroll' }) {
  const grid = variant === 'resumen' ? RESUMEN_GRID : FLOTA_GRID;
  const cellPad = variant === 'resumen' ? '8px 14px' : '11px 12px';
  const fit = mode === 'fit';

  const wrapRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  // `capacity` arranca en 1 en modo fit para que la lista aporte la mínima altura
  // intrínseca posible: si no, en el primer layout el alto sin recortar de esta
  // columna domina la fila del grid en vez de estirarse a la par de la vecina.
  const [fitInfo, setFitInfo] = useState({ capacity: fit ? 1 : 0, rowH: 0 });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rowH = probeRef.current?.getBoundingClientRect().height ?? 0;
      const available = el.clientHeight;
      if (!rowH || !available) return;
      const capacity = Math.max(1, Math.floor(available / rowH));
      setFitInfo((prev) => (prev.capacity === capacity && prev.rowH === rowH ? prev : { capacity, rowH }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows.length]);

  const displayRows = fit ? rows.slice(0, fitInfo.capacity) : rows;
  // Cuando hay menos filas de las que entran, el resto se completa con filas
  // fantasma: la tabla conserva su estructura con 1 resultado o con 15, y nunca
  // queda un hueco liso abajo.
  const ghosts = rows.length ? Math.max(0, fitInfo.capacity - displayRows.length) : 0;
  // Las filas crecen desde su alto natural para repartirse el sobrante, así el
  // conjunto llena el contenedor exacto sin dejar espacio muerto.
  const rowFlex: CSSProperties['flex'] = fit ? '1 0 auto' : 'none';

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
      <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', position: 'relative', flex: 1, minHeight: 0, overflowY: fit ? 'hidden' : 'auto' }}>
        {/* Sonda oculta: mide el alto natural de una fila sin verse afectada por
            el estirado de las filas reales. */}
        {rows[0] && (
          <div ref={probeRef} aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, visibility: 'hidden', pointerEvents: 'none' }}>
            {renderRow(rows[0])}
          </div>
        )}
        {displayRows.map(renderRow)}
        {Array.from({ length: ghosts }, (_, i) => (
          <div key={'ghost' + i} aria-hidden style={{ flex: '1 0 auto', height: fitInfo.rowH, borderBottom: '1px solid #f4efe4' }} />
        ))}
        {!rows.length && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontSize: 13, color: '#6b665c' }}>Ningún vehículo coincide con estos filtros</div>
        )}
      </div>
    </>
  );
}
