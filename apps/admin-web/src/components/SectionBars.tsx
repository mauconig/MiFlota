import { useState } from 'react';
import type { BarItem } from '../useFleetView';
import { Btn } from './Btn';
import { fmtShort } from '../format';
import { sectionTitle } from '../styles';

const METRICS: { key: 'ing' | 'egr' | 'net'; label: string; color: string }[] = [
  { key: 'ing', label: 'Ingresos', color: '#2e7d5b' },
  { key: 'egr', label: 'Egresos', color: '#c0553f' },
  { key: 'net', label: 'Neto', color: '' },
];

const netColor = (value: number) => (value > 0 ? '#2e7d5b' : value < 0 ? '#c0553f' : '#b5791a');

/**
 * Gráfico de barras horizontales del resumen: con "Todas" una barra por
 * sección, y al elegir una sección baja a una barra por vehículo. Tocar una
 * barra aplica el filtro de sección o abre la ficha, según el nivel.
 */
export function SectionBars({ bars, title, hide }: { bars: BarItem[]; title: string; hide: boolean }) {
  const [metric, setMetric] = useState<'ing' | 'egr' | 'net'>('net');
  const activa = METRICS.find((m) => m.key === metric) ?? METRICS[2];
  const value = (bar: BarItem) => bar[metric];
  const color = (bar: BarItem) => (metric === 'net' ? netColor(bar.net) : activa.color);

  const ordenadas = [...bars].sort((a, b) => Math.abs(value(b)) - Math.abs(value(a)));
  const max = Math.max(...ordenadas.map((bar) => Math.abs(value(bar))), 1);

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

      {!ordenadas.length ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontSize: 13, color: '#6b665c' }}>
          Ningún vehículo coincide con estos filtros
        </div>
      ) : (
        <div className="scroll-sin-barra" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 14px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {ordenadas.map((bar) => (
            <Btn
              key={bar.key}
              onClick={bar.open}
              ariaLabel={`${bar.label}${bar.sub ? ' · ' + bar.sub : ''}: ${fmtShort(value(bar), hide) || 'monto oculto'}`}
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
                <span style={{ display: 'block', height: '100%', borderRadius: 5, width: `${Math.max(2, Math.round((Math.abs(value(bar)) / max) * 100))}%`, background: color(bar) }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a18', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {fmtShort(value(bar), hide)}
              </span>
            </Btn>
          ))}
        </div>
      )}
    </div>
  );
}
