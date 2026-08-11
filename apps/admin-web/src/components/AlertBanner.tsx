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
}: {
  icon: ReactNode;
  iconBg: string;
  iconFg: string;
  title: string;
  summary: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <Btn
      onClick={onClick}
      style={{ ...card, padding: '11px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
      hoverStyle={{ background: '#fbf7ee' }}
    >
      <span style={{ width: 36, height: 36, borderRadius: 11, background: iconBg, color: iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <span style={sectionTitle}>{title}</span>
          {badge != null && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9, background: iconBg, color: iconFg, flex: 'none' }}>{badge}</span>}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: '#6b665c', marginTop: 2 }}>{summary}</span>
      </span>
      <ChevronIcon size={16} />
    </Btn>
  );
}
