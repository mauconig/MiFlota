interface Chip {
  label: string;
  bg: string;
  fg: string;
  bd: string;
  pick: () => void;
}

export function ChipRow({ chips, wrap, equal }: { chips: Chip[]; wrap?: boolean; equal?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 7, flexWrap: wrap ? 'wrap' : 'nowrap', overflow: wrap ? 'visible' : 'auto' }}>
      {chips.map((c, i) => (
        <button
          key={i}
          onClick={c.pick}
          style={{
            flex: equal ? 1 : 'none',
            border: '1px solid ' + c.bd,
            background: c.bg,
            color: c.fg,
            borderRadius: 19,
            padding: equal ? '9px 0' : '8px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
