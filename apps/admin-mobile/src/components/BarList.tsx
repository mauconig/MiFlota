interface Bar {
  label: string;
  w: number;
  color: string;
  short: string;
}

export function BarList({ bars, labelWidth = 66 }: { bars: Bar[]; labelWidth?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {bars.map((b, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: labelWidth + 'px 1fr 62px', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
          <div style={{ height: 8, borderRadius: 4, background: '#f0ebe0', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '0 auto 0 0', width: b.w + '%', borderRadius: 4, background: b.color }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', color: b.color }}>{b.short}</span>
        </div>
      ))}
    </div>
  );
}
