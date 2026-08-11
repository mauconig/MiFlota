import type { View } from '../useFleetView';

export function Toast({ v }: { v: View }) {
  if (!v.hasToast) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 28,
        transform: 'translateX(-50%)',
        background: '#16150f',
        color: '#fffdf8',
        fontSize: 13,
        fontWeight: 600,
        padding: '13px 20px',
        borderRadius: 16,
        boxShadow: '0 10px 26px rgba(22,21,15,0.3)',
        animation: 'toastIn 0.22s ease',
        zIndex: 60,
      }}
    >
      {v.toastMsg}
    </div>
  );
}
