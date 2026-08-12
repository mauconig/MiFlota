export function MoneyDisplay({ display, color, hint }: { display: string; color: string; hint: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
      <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', color }}>{display}</div>
      <div style={{ fontSize: 12, color: '#6b665c', marginTop: 2 }}>{hint}</div>
    </div>
  );
}
