import { useState } from 'react';
import type { BarItem } from '../useFleetView';
import { Btn } from './Btn';
import { fmtShort } from '../format';
import { sectionTitle } from '../styles';

type MetricKey = 'ing' | 'egr' | 'net';

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'ing', label: 'Ingresos' },
  { key: 'egr', label: 'Egresos' },
  { key: 'net', label: 'Neto' },
];

/** Paleta de porciones: tonos que combinan con el panel. El color se asigna por
 *  orden alfabético, no por tamaño, para que una sección no cambie de color al
 *  cambiar de métrica. */
const SLICE_COLORS = ['#2e7d5b', '#e8a13a', '#4a7fb5', '#8a6bb1', '#c0553f', '#b5791a', '#4a9d7f', '#b3aa99'];

const netColor = (value: number) => (value > 0 ? '#2e7d5b' : value < 0 ? '#c0553f' : '#b5791a');

/** Con pocas filas el gráfico se estira para llenar la tarjeta; con muchas (el
 *  drill-down por vehículo) las filas vuelven a alto fijo y el cuerpo scrollea. */
/** Alto de cada fila de la lista: compacto y parejo, todas juntas. */
const ALTO_FILA = 36;
/** La dona crece con el alto disponible, con estos topes para que no se vaya de
 *  escala ni se achique de más. */
const ALTO_MIN_DONA = 260;
const ALTO_MAX_DONA = 460;

/** Ancho de las columnas numéricas del resumen de abajo. */
const RESUMEN_COLS = '110px 110px 110px';

/**
 * Gráfico del resumen con un solo bloque a la vez: dona para Ingresos y Egresos
 * (con la leyenda al costado) y barras horizontales para Neto, que sí admite
 * valores negativos. Debajo va un resumen con las tres columnas por fila y el
 * total. Con "Todas" cada fila es una sección y al elegir una sección baja a una
 * fila por vehículo; tocar navega en todos los casos.
 */
export function SectionChart({ bars, title, hide, firstColumn }: { bars: BarItem[]; title: string; hide: boolean; firstColumn: string }) {
  const [metric, setMetric] = useState<MetricKey>('ing');

  const colorPorClave = new Map(
    [...bars].sort((a, b) => a.label.localeCompare(b.label, 'es')).map((bar, i) => [bar.key, SLICE_COLORS[i % SLICE_COLORS.length]]),
  );
  const colorOf = (bar: BarItem) => colorPorClave.get(bar.key) ?? SLICE_COLORS[0];
  const valor = (bar: BarItem) => (metric === 'ing' ? bar.ing : metric === 'egr' ? bar.egr : bar.net);

  const filas = [...bars].sort((a, b) => Math.abs(valor(b)) - Math.abs(valor(a)));
  const total = filas.reduce((sum, bar) => sum + valor(bar), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '10px 16px 4px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flex: 'none' }}>
        <span style={{ flex: 1, minWidth: 0, ...sectionTitle }}>{title}</span>
        {METRICS.map((m) => (
          <Btn
            key={m.key}
            onClick={() => setMetric(m.key)}
            style={{
              border: `1px solid ${metric === m.key ? '#16150f' : '#e6ded0'}`,
              background: metric === m.key ? '#16150f' : '#fffdf8',
              color: metric === m.key ? '#fffdf8' : '#5f5a51',
              borderRadius: 12,
              minHeight: 30,
              padding: '0 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            hoverStyle={metric === m.key ? undefined : { borderColor: '#c9bfae' }}
          >
            {m.label}
          </Btn>
        ))}
      </div>

      {!filas.length ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontSize: 13, color: '#6b665c' }}>
          Ningún vehículo coincide con estos filtros
        </div>
      ) : (
        <div className="scroll-sin-barra" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 34,
              padding: '6px 20px 10px',
            }}
          >
            {metric !== 'net' && <Donut filas={filas} valor={valor} total={total} hide={hide} colorOf={colorOf} />}
              <Legend filas={filas} valor={valor} metric={metric} total={total} hide={hide} colorOf={colorOf} />
          </div>
          <Summary filas={filas} hide={hide} firstColumn={firstColumn} />
        </div>
      )}
    </div>
  );
}

/** Dona con el total en el centro. Toma el alto disponible para acompañar a la lista. */
function Donut({
  filas,
  valor,
  total,
  hide,
  colorOf,
}: {
  filas: BarItem[];
  valor: (bar: BarItem) => number;
  total: number;
  hide: boolean;
  colorOf: (bar: BarItem) => string;
}) {
  const [activa, setActiva] = useState<string | null>(null);

  // Con el mouse sobre una porción, el centro deja de mostrar el total y pasa a
  // mostrar esa porción: nombre, monto y % (el mismo redondeo que la leyenda).
  const hovered = filas.find((bar) => bar.key === activa) ?? null;
  const hoveredValor = hovered ? valor(hovered) : 0;
  const hoveredPct = hovered && total ? Math.round((hoveredValor / total) * 100) : 0;

  // Cada porción es un trazo de círculo: con r = 15.9155 la circunferencia mide
  // ~100, así el porcentaje se usa directo como dash. El grupo rotado -90°
  // arranca en las 12 en punto y el offset corre cada porción.
  let acumulado = 0;
  const arcos = filas.map((bar) => {
    const pct = total ? (valor(bar) / total) * 100 : 0;
    const arco = { key: bar.key, color: colorOf(bar), dash: `${pct} ${100 - pct}`, offset: -acumulado };
    acumulado += pct;
    return arco;
  });

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: ALTO_MIN_DONA, maxHeight: ALTO_MAX_DONA, aspectRatio: '1 / 1', flex: 'none' }}>
      <svg viewBox="0 0 42 42" style={{ width: '100%', height: '100%' }}>
        <g transform="rotate(-90 21 21)">
          {arcos.map((arco) => (
            <circle
              key={arco.key}
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              stroke={arco.color}
              strokeWidth={activa && activa !== arco.key ? 4.8 : 5.6}
              strokeDasharray={arco.dash}
              strokeDashoffset={arco.offset}
              opacity={activa && activa !== arco.key ? 0.35 : 1}
              style={{ cursor: 'pointer', transition: 'opacity 120ms, stroke-width 120ms' }}
              onClick={() => filas.find((bar) => bar.key === arco.key)?.open()}
              onMouseEnter={() => setActiva(arco.key)}
              onMouseLeave={() => setActiva(null)}
            />
          ))}
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0 19%', pointerEvents: 'none' }}>
        {hovered ? (
          <>
            <span style={{ width: '100%', fontSize: 11, fontWeight: 700, lineHeight: 1.25, color: '#6b665c', textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{hovered.label}</span>
            {hide ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6b665c' }}>monto oculto</span>
            ) : (
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{fmtShort(hoveredValor, hide)}</span>
            )}
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b665c' }}>{hoveredPct}%</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#6b665c' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{fmtShort(total, hide)}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Leyenda (dona) o barras (neto), con las filas estiradas cuando hay pocas. */
function Legend({
  filas,
  valor,
  metric,
  total,
  hide,
  colorOf,
}: {
  filas: BarItem[];
  valor: (bar: BarItem) => number;
  metric: MetricKey;
  total: number;
  hide: boolean;
  colorOf: (bar: BarItem) => string;
}) {
  const [activa, setActiva] = useState<string | null>(null);
  const usaBarra = metric === 'net';
  const max = Math.max(...filas.map((bar) => Math.abs(valor(bar))), 1);

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {filas.map((bar) => {
        const monto = valor(bar);
        const pct = total ? Math.round((monto / total) * 100) : 0;
        return (
          <Btn
            key={bar.key}
            onClick={bar.open}
            ariaLabel={`${bar.label}${bar.sub ? ' · ' + bar.sub : ''}: ${fmtShort(monto, hide) || 'monto oculto'}`}
            style={{
              display: 'grid',
              gridTemplateColumns: usaBarra ? '170px minmax(0, 1fr) 110px' : 'minmax(0, 1fr) 92px 46px',
              alignItems: 'center',
              gap: 14,
              width: '100%',
              flex: usaBarra ? '1 1 0' : 'none',
              minHeight: usaBarra ? 56 : ALTO_FILA,
              border: 'none',
              background: activa === bar.key ? '#f7f3eb' : 'transparent',
              borderRadius: 12,
              padding: '4px 10px',
              cursor: 'pointer',
              textAlign: 'left',
              color: 'inherit',
            }}
            hoverStyle={{ background: '#f7f3eb' }}
          >
            <span onMouseEnter={() => setActiva(bar.key)} onMouseLeave={() => setActiva(null)} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: usaBarra ? netColor(bar.net) : colorOf(bar), flex: 'none' }} />
              <span title={bar.sub ? `${bar.label} · ${bar.sub}` : bar.label} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: '#3d3a34' }}>
                {bar.label}
              </span>
            </span>

            {usaBarra && (
              <span style={{ height: 34, borderRadius: 9, background: '#f0ebe0', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', borderRadius: 9, width: `${Math.max(2, Math.round((Math.abs(monto) / max) * 100))}%`, background: netColor(bar.net) }} />
              </span>
            )}

            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtShort(monto, hide)}</span>
            {!usaBarra && <span style={{ fontSize: 12, color: '#6b665c', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>}
          </Btn>
        );
      })}
    </div>
  );
}

/** Resumen general: las tres columnas por fila y el total al pie. */
function Summary({ filas, hide, firstColumn }: { filas: BarItem[]; hide: boolean; firstColumn: string }) {
  const sum = (pick: (bar: BarItem) => number) => filas.reduce((acc, bar) => acc + pick(bar), 0);
  const ingresoTotal = sum((bar) => bar.ing);
  const egresoTotal = sum((bar) => bar.egr);
  const netoTotal = sum((bar) => bar.net);
  const grid = { display: 'grid', gridTemplateColumns: `minmax(0, 1fr) ${RESUMEN_COLS}`, gap: 14, alignItems: 'center' };

  return (
    <section style={{ flex: 'none', borderTop: '1px solid #f0ebe0', padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ ...grid, padding: '0 10px 5px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b665c' }}>
        <span>{firstColumn}</span>
        <span style={{ textAlign: 'right' }}>Ingresos</span>
        <span style={{ textAlign: 'right' }}>Egresos</span>
        <span style={{ textAlign: 'right' }}>Neto</span>
      </div>

      {filas.map((bar) => (
        <Btn
          key={bar.key}
          onClick={bar.open}
          ariaLabel={`${bar.label}: ingresos ${fmtShort(bar.ing, hide)}, egresos ${fmtShort(bar.egr, hide)}, neto ${fmtShort(bar.net, hide)}`}
          style={{ ...grid, width: '100%', border: 'none', background: 'transparent', borderRadius: 9, padding: '6px 10px', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
          hoverStyle={{ background: '#f7f3eb' }}
        >
          <span title={bar.sub ? `${bar.label} · ${bar.sub}` : bar.label} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, color: '#3d3a34' }}>
            {bar.label}
          </span>
          <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#2e7d5b', fontVariantNumeric: 'tabular-nums' }}>{fmtShort(bar.ing, hide)}</span>
          <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#c0553f', fontVariantNumeric: 'tabular-nums' }}>{fmtShort(bar.egr, hide)}</span>
          <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: netColor(bar.net), fontVariantNumeric: 'tabular-nums' }}>{fmtShort(bar.net, hide)}</span>
        </Btn>
      ))}

      <div style={{ ...grid, padding: '7px 10px 0', marginTop: 2, borderTop: '1px solid #f0ebe0' }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b665c' }}>Total</span>
        <span style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#2e7d5b', fontVariantNumeric: 'tabular-nums' }}>{fmtShort(ingresoTotal, hide)}</span>
        <span style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#c0553f', fontVariantNumeric: 'tabular-nums' }}>{fmtShort(egresoTotal, hide)}</span>
        <span style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: netColor(netoTotal), fontVariantNumeric: 'tabular-nums' }}>{fmtShort(netoTotal, hide)}</span>
      </div>
    </section>
  );
}
