interface AlertCardView {
  txt: string;
  sub: string;
  color: string;
  bg: string;
  bd: string;
  iconBg: string;
}

export function AlertCard({ a }: { a: AlertCardView }) {
  return (
    <div style={{ background: a.bg, border: '1px solid ' + a.bd, borderRadius: 18, padding: '12px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      <span style={{ width: 30, height: 30, borderRadius: 15, background: a.iconBg, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{a.txt}</div>
        <div style={{ fontSize: 11, color: '#6b665c', marginTop: 1 }}>{a.sub}</div>
      </div>
    </div>
  );
}
