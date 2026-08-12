import { Tag } from './Tag';

interface MovRowView {
  desc: string;
  sub: string;
  icon: string;
  iconBg: string;
  color: string;
  amt: string;
  showTag: boolean;
  tag: string;
  tagBg: string;
  tagFg: string;
}

export function MovRow({ m }: { m: MovRowView }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #f4efe4' }}>
      <span style={{ width: 36, height: 36, borderRadius: 18, background: m.iconBg, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 11, fontWeight: 700 }}>{m.icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{m.desc}</span>
        <span style={{ display: 'block', fontSize: 11, color: '#6b665c', marginTop: 1 }}>{m.sub}</span>
      </span>
      {m.showTag && <Tag label={m.tag} bg={m.tagBg} fg={m.tagFg} small />}
      <span style={{ flex: 'none', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: m.color }}>{m.amt}</span>
    </div>
  );
}
