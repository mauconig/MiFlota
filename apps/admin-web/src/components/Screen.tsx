import type { CSSProperties, ReactNode } from 'react';

/**
 * Raíz de toda pantalla. `main` es un flex column de alto fijo, así que un hijo
 * con altura natural deja el sobrante como fondo vacío abajo. `flex:1` +
 * `minHeight:0` hace que la pantalla siempre ocupe exactamente el alto
 * disponible, ni más ni menos — el scroll, si hace falta, va adentro (ver
 * `ScrollArea`), nunca en la página.
 */
export function Screen({ label, style, children }: { label: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <section data-screen-label={label} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, ...style }}>
      {children}
    </section>
  );
}

/**
 * Zona de contenido que se lleva todo el alto sobrante de su tarjeta y scrollea
 * puertas adentro, dejando fijos cabecera, filtros y paginador.
 */
export function ScrollArea({ style, children }: { style?: CSSProperties; children: ReactNode }) {
  return <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...style }}>{children}</div>;
}

/** Estado vacío: una pantalla sin datos tiene que decir por qué, no quedar en blanco. */
export function Vacio({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#3d3a34' }}>{titulo}</div>
      {detalle && <div style={{ fontSize: 13, color: '#6b665c', maxWidth: 380 }}>{detalle}</div>}
    </div>
  );
}
