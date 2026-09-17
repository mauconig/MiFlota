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

/**
 * Gráfico del resumen: dona con el total en el centro y leyenda para Ingresos y
 * Egresos, y barras horizontales para Neto (una dona no puede representar
 * porciones negativas). Con "Todas" muestra una porción por sección y al elegir
 * una sección baja a una porción por vehículo; tocar navega en ambos casos.
 */
export function SectionChart({ bars, title, hide }: { bars: BarItem[]; title: string; hide: boolean }) {
  const [metric, setMetric] = useState<MetricKey>('ing');

  const colorPorClave = new Map(
    [...bars].sort((a, b) => a.label.localeCompare(b.label, 'es')).map((bar, i) => [bar.key, SLICE_COLORS[i % SLICE_COLORS.length]]),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '10px 14px 6px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flex: 'none' }}>
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

      {!bars.length ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontSize: 13, color: '#6b665c' }}>
          Ningún vehículo coincide con estos filtros
        </div>
      ) : metric === 'net' ? (
        <NetBars bars={bars} hide={hide} />
      ) : (
        <Donut bars={bars} hide={hide} metric={metric} colorOf={(bar) => colorPorClave.get(bar.key) ?? SLICE_COLORS[0]} />
      )}
    </div>
  );
}

/** Dona con el total en el centro y leyenda navegable a la derecha. */
function Donut({ bars, hide, metric, colorOf }: { bars: BarItem[]; hide: boolean; metric: 'ing' | 'egr'; colorOf: (bar: BarItem) => string }) {
  const [activa, setActiva] = useState<string | null>(null);
  const porciones = bars
    .map((bar) => ({ bar, value: metric === 'ing' ? bar.ing : bar.egr }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = porciones.reduce((sum, slice) => sum + slice.value, 0);

  if (!total) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontSize: 13, color: '#6b665c' }}>
        Sin {metric === 'ing' ? 'ingresos' : 'egresos'} en el período
      </div>
    );
  }

  // Cada porción se dibuja como un trazo de círculo: con r = 15.9155 la
  // circunferencia mide ~100, así el porcentaje se usa directo como dash y el
  // grupo rotado -90° arranca en las 12 en punto.
  let acumulado = 0;
  const arcos = porciones.map((slice) => {
    const pct = (slice.value / total) * 100;
    const arco = { key: slice.bar.key, color: colorOf(slice.bar), dash: `${pct} ${100 - pct}`, offset: -acumulado };
    acumulado += pct;
    return arco;
  });

  return (
    <div className="scroll-sin-barra" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 14px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 22 }}>
      <div style={{ position: 'relative', width: 176, height: 176, flex: 'none' }}>
        <svg viewBox="0 0 42 42" width={176} height={176}>
          <g transform="rotate(-90 21 21)">
            {arcos.map((arco) => (
              <circle
                key={arco.key}
                cx="21"
                cy="21"
                r="15.9155"
                fill="none"
                stroke={arco.color}
                strokeWidth={activa && activa !== arco.key ? 4.6 : 5.6}
                strokeDasharray={arco.dash}
                strokeDashoffset={arco.offset}
                opacity={activa && activa !== arco.key ? 0.35 : 1}
                style={{ cursor: 'pointer', transition: 'opacity 120ms, stroke-width 120ms' }}
                onClick={() => porciones.find((slice) => slice.bar.key === arco.key)?.bar.open()}
                onMouseEnter={() => setActiva(arco.key)}
                onMouseLeave={() => setActiva(null)}
              />
            ))}
          </g>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#6b665c' }}>{metric === 'ing' ? 'Ingresos' : 'Egresos'}</span>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{fmtShort(total, hide)}</span>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: porciones.length > 7 ? '1fr 1fr' : '1fr', gap: '4px 18px', alignContent: 'center' }}>
        {porciones.map((slice) => {
          const pct = Math.round((slice.value / total) * 100);
          return (
            <Btn
              key={slice.bar.key}
              onClick={slice.bar.open}
              ariaLabel={`${slice.bar.label}: ${fmtShort(slice.value, hide) || 'monto oculto'} (${pct}%)`}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                border: 'none',
                borderRadius: 10,
                background: activa === slice.bar.key ? '#f7f3eb' : 'transparent',
                padding: '5px 8px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
              }}
              hoverStyle={{ background: '#f7f3eb' }}
            >
              <span
                onMouseEnter={() => setActiva(slice.bar.key)}
                onMouseLeave={() => setActiva(null)}
                style={{ width: 9, height: 9, borderRadius: 5, background: colorOf(slice.bar), flex: 'none' }}
              />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, color: '#3d3a34' }}>{slice.bar.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a18', fontVariantNumeric: 'tabular-nums' }}>{fmtShort(slice.value, hide)}</span>
              <span style={{ fontSize: 11, color: '#6b665c', fontVariantNumeric: 'tabular-nums', minWidth: 30, textAlign: 'right' }}>{pct}%</span>
            </Btn>
          );
        })}
      </div>
    </div>
  );
}

/** Neto: barras horizontales, que sí representan valores negativos. */
function NetBars({ bars, hide }: { bars: BarItem[]; hide: boolean }) {
  const ordenadas = [...bars].sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  const max = Math.max(...ordenadas.map((bar) => Math.abs(bar.net)), 1);
  return (
    <div className="scroll-sin-barra" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 14px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
      {ordenadas.map((bar) => (
        <Btn
          key={bar.key}
          onClick={bar.open}
          ariaLabel={`${bar.label}${bar.sub ? ' · ' + bar.sub : ''}: ${fmtShort(bar.net, hide) || 'monto oculto'}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '96px 1fr 78px',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            border: 'none',
            background: 'transparent',
            borderRadius: 10,
            padding: '4px 6px',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'inherit',
          }}
          hoverStyle={{ background: '#f7f3eb' }}
        >
          <span title={bar.sub ? `${bar.label} · ${bar.sub}` : bar.label} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700, color: '#3d3a34' }}>
            {bar.label}
          </span>
          <span style={{ height: 10, borderRadius: 5, background: '#f0ebe0', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', borderRadius: 5, width: `${Math.max(2, Math.round((Math.abs(bar.net) / max) * 100))}%`, background: netColor(bar.net) }} />
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a18', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {fmtShort(bar.net, hide)}
          </span>
        </Btn>
      ))}
    </div>
  );
}
