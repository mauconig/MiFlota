import type { Chip } from '../useFleetView';
import { Btn } from './Btn';
import { EyeIcon } from '../icons';

export function Header({
  kicker,
  pageTitle,
  headerSub,
  periodChips,
  isCustom,
  cFrom,
  cTo,
  onFrom,
  onTo,
  montosLbl,
  toggleMontos,
}: {
  kicker: string;
  pageTitle: string;
  headerSub: string;
  periodChips: Chip[];
  isCustom: boolean;
  cFrom: string;
  cTo: string;
  onFrom: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  montosLbl: string;
  toggleMontos: () => void;
}) {
  return (
    <header style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b665c' }}>{kicker}</div>
        <h1 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{pageTitle}</h1>
        <div style={{ fontSize: 13, color: '#6b665c', marginTop: 4 }}>{headerSub}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flex: 'none' }}>
        {periodChips.map((p) => (
          <Btn
            key={p.label}
            onClick={p.pick}
            style={{ border: `1px solid ${p.bd}`, background: p.bg, color: p.fg, borderRadius: 14, minHeight: 34, padding: '0 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {p.label}
          </Btn>
        ))}
        {isCustom && (
          <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, background: '#fffdf8', border: '1px solid #e0d6c4', borderRadius: 14, padding: '0 10px', minHeight: 34 }}>
            <input type="date" value={cFrom} onChange={onFrom} style={{ border: 'none', background: 'none', fontSize: 12, color: '#3d3a34', outline: 'none', width: 118 }} />
            <span style={{ fontSize: 12, color: '#6b665c' }}>→</span>
            <input type="date" value={cTo} onChange={onTo} style={{ border: 'none', background: 'none', fontSize: 12, color: '#3d3a34', outline: 'none', width: 118 }} />
          </span>
        )}
        <Btn
          onClick={toggleMontos}
          style={{
            border: '1px solid #e0d6c4',
            background: '#fffdf8',
            color: '#3d3a34',
            borderRadius: 14,
            minHeight: 34,
            padding: '0 13px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
          hoverStyle={{ background: '#f7f1e5' }}
        >
          <EyeIcon size={16} />
          {montosLbl}
        </Btn>
      </div>
    </header>
  );
}
