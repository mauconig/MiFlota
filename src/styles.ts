import type { CSSProperties } from 'react';

export const card: CSSProperties = { background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 20 };
export const cardTight: CSSProperties = { background: '#fffdf8', border: '1px solid #ece4d6', borderRadius: 18 };
export const sectionTitle: CSSProperties = { fontSize: 14, fontWeight: 700 };
export const linkBtn: CSSProperties = { border: 'none', background: 'none', color: '#b5791a', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 };
export const linkBtnHover: CSSProperties = { color: '#8d5c10' };

/* ---- Modales ---- */

export const modalOverlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(22,21,15,0.42)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 70,
};
export const modalPanel: CSSProperties = {
  background: '#fffdf8',
  borderRadius: 24,
  padding: 24,
  maxWidth: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  boxShadow: '0 24px 60px rgba(22,21,15,0.3)',
};
export const modalTitle: CSSProperties = { flex: 1, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' };
export const modalCloseBtn: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 17,
  border: '1px solid #e6ded0',
  background: '#fffdf8',
  cursor: 'pointer',
  color: '#3d3a34',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
};
export const modalCloseBtnHover: CSSProperties = { background: '#f7f1e5' };
export const modalFooter: CSSProperties = { display: 'flex', flexDirection: 'row', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f0ebe0', paddingTop: 18 };

/* `minWidth:0` es lo que permite que el campo se encoja: un <input> trae un
   ancho intrínseco propio y sin esto desborda cualquier grilla `1fr 1fr`. */
export const fieldLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 };
export const fieldLabelText: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b665c' };
export const fieldInput: CSSProperties = {
  width: '100%',
  minWidth: 0,
  border: '1px solid #e0d6c4',
  borderRadius: 14,
  minHeight: 44,
  padding: '0 14px',
  fontSize: 14,
  color: '#1a1a18',
  background: '#fffdf8',
  outline: 'none',
};

export const btnSecondary: CSSProperties = { border: '1px solid #e0d6c4', background: '#fffdf8', color: '#3d3a34', borderRadius: 14, minHeight: 44, padding: '0 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
export const btnSecondaryHover: CSSProperties = { background: '#f7f1e5' };
export const btnPrimary: CSSProperties = { border: 'none', background: '#16150f', color: '#fffdf8', borderRadius: 14, minHeight: 44, padding: '0 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
export const btnPrimaryHover: CSSProperties = { background: '#2a2820' };
