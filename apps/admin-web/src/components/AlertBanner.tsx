import { useState } from 'react';
import type { ReactNode } from 'react';
import { Btn } from './Btn';
import { ChevronIcon } from '../icons';
import { card, sectionTitle } from '../styles';

export function AlertBanner({
  icon,
  iconBg,
  iconFg,
  title,
  summary,
  badge,
  onClick,
  items,
}: {
  icon: ReactNode;
  iconBg: string;
  iconFg: string;
  title: string;
  summary: string;
  badge?: number;
  onClick: () => void;
  /** Avisos de prioridad alta para el vistazo rápido. */
  items?: { key: string; plate: string; text: string; open: () => void }[];
}) {
  const [hover, setHover] = useState(false);
  return (
    // Es un `div` y no un botón: adentro van filas clickeables propias y un
    // botón dentro de otro botón es HTML inválido.
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ ...card, padding: '11px 14px', display: 'flex', flexDirection: 'column', gap: items?.length ? 8 : 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', background: hover ? '#fbf7ee' : card.background }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, background: iconBg, color: iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{icon}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <span style={sectionTitle}>{title}</span>
            {badge != null && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9, background: iconBg, color: iconFg, flex: 'none' }}>{badge}</span>}
          </span>
          <span style={{ display: 'block', fontSize: 12, color: '#6b665c', marginTop: 2 }}>{summary}</span>
        </span>
        <ChevronIcon size={16} />
      </div>

      {!!items?.length && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginLeft: 48, padding: 6, borderRadius: 12, background: '#f4f0e8' }}>
          {items.map((item) => (
            <Btn
              key={item.key}
              onClick={(e) => {
                e.stopPropagation();
                item.open();
              }}
              ariaLabel={`Ver ${item.plate}: ${item.text}`}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', border: 'none', background: 'transparent', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
              hoverStyle={{ background: '#e8e0d2' }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 4, background: iconFg, flex: 'none' }} />
              <span style={{ flex: 'none', fontSize: 12, fontWeight: 800, color: '#2b2823' }}>{item.plate}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#4a463c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</span>
            </Btn>
          ))}
        </div>
      )}
    </div>
  );
}
