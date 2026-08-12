export function Tag({ label, bg, fg, small }: { label: string; bg: string; fg: string; small?: boolean }) {
  return (
    <span
      style={{
        fontSize: small ? 9 : 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: small ? '2px 7px' : '2px 7px',
        borderRadius: small ? 9 : 10,
        background: bg,
        color: fg,
        flex: 'none',
      }}
    >
      {label}
    </span>
  );
}
