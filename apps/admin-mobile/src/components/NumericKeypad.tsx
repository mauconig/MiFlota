export function NumericKeypad({ keys }: { keys: { label: string; press: () => void }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      {keys.map((k, i) => (
        <button
          key={i}
          onClick={k.press}
          style={{ background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 16, minHeight: 46, fontSize: 19, fontWeight: 600, cursor: 'pointer', color: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {k.label}
        </button>
      ))}
    </div>
  );
}
