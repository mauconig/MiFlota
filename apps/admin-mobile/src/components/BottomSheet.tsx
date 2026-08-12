import type { ReactNode } from 'react';

export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(22,21,15,0.38)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fffdf8', borderRadius: '26px 26px 0 0', padding: '16px 18px 22px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '80%', overflowY: 'auto', animation: 'sheetIn 0.22s ease' }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>{title}</span>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ width: 34, height: 34, borderRadius: 17, border: '1px solid #e6ded0', background: '#fffdf8', cursor: 'pointer', color: '#3d3a34', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
