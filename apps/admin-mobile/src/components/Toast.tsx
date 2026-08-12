export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 16,
        right: 16,
        marginBottom: 14,
        background: '#16150f',
        color: '#fffdf8',
        fontSize: 13,
        fontWeight: 600,
        padding: '13px 16px',
        borderRadius: 16,
        animation: 'toastIn 0.22s ease',
        zIndex: 50,
      }}
    >
      {msg}
    </div>
  );
}
