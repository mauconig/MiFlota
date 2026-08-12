import type { CSSProperties } from 'react';

export function Avatar({ label, size = 36, bg = '#f4f0e8', fg = '#5f5a51', style }: { label: string; size?: number; bg?: string; fg?: string; style?: CSSProperties }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        flex: 'none',
        ...style,
      }}
    >
      {label}
    </span>
  );
}
