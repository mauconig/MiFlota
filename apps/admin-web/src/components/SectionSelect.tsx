import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SectionFilter } from '../types';

/**
 * Selector de sección con lista propia.
 *
 * El `<select>` nativo abre el desplegable con el estilo del sistema y
 * desentona con el resto del panel (y no hay forma de estilarlo). Acá el botón
 * y la lista se dibujan con el mismo lenguaje visual que las tarjetas.
 *
 * La lista va en un portal con posición fija porque las tablas viven dentro de
 * tarjetas con `overflow: hidden`: un desplegable absoluto quedaría recortado.
 */
export function SectionSelect({
  value,
  onChange,
  options,
  width = 156,
  ariaLabel = 'Filtrar por sección',
}: {
  value: SectionFilter;
  onChange: (value: SectionFilter) => void;
  options: { id: number; name: string }[];
  width?: number;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number; minWidth: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const items: { key: string; label: string; value: SectionFilter }[] = [
    { key: 'todos', label: 'Todas', value: 'todos' },
    ...options.map((section) => ({ key: String(section.id), label: section.name, value: section.id as SectionFilter })),
    { key: 'sin', label: 'Sin sección', value: 'sin' },
  ];
  const selected = items.find((item) => item.key === String(value)) ?? items[0];

  const abrir = () => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ left: r.left, top: r.bottom + 6, minWidth: r.width });
    setOpen(true);
  };

  // Se cierra al tocar afuera, con Escape, y ante scroll o resize: mantener la
  // lista pegada al botón costaría más que volver a abrirla.
  useEffect(() => {
    if (!open) return;
    const fuera = (e: MouseEvent) => {
      const target = e.target as Node;
      if (trigger.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const reflow = () => setOpen(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', reflow, true);
      window.removeEventListener('resize', reflow);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? setOpen(false) : abrir())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${selected.label}`}
        style={{
          width,
          minHeight: 34,
          flex: 'none',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          border: '1px solid #e0d6c4',
          borderRadius: 12,
          padding: '0 10px 0 12px',
          background: '#fffdf8',
          fontSize: 12,
          color: '#3d3a34',
          cursor: 'pointer',
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{selected.label}</span>
        <Chevron open={open} />
      </button>

      {open && anchor && createPortal(
        <div
          ref={panel}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            left: anchor.left,
            top: anchor.top,
            minWidth: anchor.minWidth,
            zIndex: 1000,
            background: '#fffdf8',
            border: '1px solid #ece4d6',
            borderRadius: 14,
            boxShadow: '0 12px 28px rgba(22,21,15,0.16)',
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {items.map((item) => {
            const elegido = item.key === selected.key;
            return (
              <button
                key={item.key}
                type="button"
                role="option"
                aria-selected={elegido}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setHover(item.key)}
                onMouseLeave={() => setHover(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: elegido ? '#f4f0e8' : hover === item.key ? '#f7f3eb' : 'transparent',
                  color: '#1a1a18',
                  fontWeight: elegido ? 700 : 500,
                }}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                {elegido && <Check />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6b665c"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: 'none', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Check() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#2e7d5b" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}
