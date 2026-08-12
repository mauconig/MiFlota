import { Avatar } from './Avatar';
import { Tag } from './Tag';

interface CarCardView {
  plate: string;
  model: string;
  driver: string;
  initials: string;
  estado: string;
  tagBg: string;
  tagFg: string;
  net: string;
  color: string;
  open: () => void;
}

export function CarCard({ c, periodShort }: { c: CarCardView; periodShort: string }) {
  return (
    <button
      onClick={c.open}
      style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 20, padding: '13px 15px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 13, width: '100%', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
    >
      <Avatar label={c.initials} size={42} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{c.plate}</span>
          <Tag label={c.estado} bg={c.tagBg} fg={c.tagFg} />
        </span>
        <span style={{ display: 'block', fontSize: 12, color: '#6b665c', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {c.model} · {c.driver}
        </span>
      </span>
      <span style={{ textAlign: 'right', flex: 'none' }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: c.color }}>{c.net}</span>
        <span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b665c', marginTop: 1 }}>neto {periodShort}</span>
      </span>
    </button>
  );
}
