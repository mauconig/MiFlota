import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Campo de fecha en `dd/mm/aaaa`.
 *
 * El `<input type="date">` nativo se dibuja con el locale del navegador e
 * ignora el `lang` de la página: en una máquina en inglés muestra `mm/dd/yyyy`,
 * que acá se lee al revés. Por eso lo que se ve y se tipea es un campo de texto
 * propio, y el nativo queda escondido detrás del botón del calendario, solo
 * para abrir el selector.
 *
 * Hacia afuera el valor sigue siendo ISO `YYYY-MM-DD`, igual que antes.
 */
export function DateField({
  value,
  onChange,
  max,
  min,
  ariaLabel,
  compact = false,
  style,
}: {
  value: string;
  onChange: (iso: string) => void;
  max?: string;
  min?: string;
  ariaLabel?: string;
  /** Versión chica, para la barra de período. */
  compact?: boolean;
  style?: CSSProperties;
}) {
  const [texto, setTexto] = useState(() => deIso(value));
  const [hover, setHover] = useState(false);
  const nativo = useRef<HTMLInputElement>(null);

  // El valor puede cambiar por fuera del tecleo: al elegir en el calendario o
  // al resetearse el formulario. Escribir a medias no cuenta, porque ahí el
  // texto todavía no representa ninguna fecha y `aIso` devuelve lo mismo.
  useEffect(() => {
    setTexto((t) => (aIso(t) === value ? t : deIso(value)));
  }, [value]);

  const escribir = (t: string) => {
    const m = maskear(t);
    setTexto(m);
    // Mientras la fecha esté incompleta el valor guardado se vacía: es preferible
    // a dejar en pie una fecha vieja que ya no es la que se está escribiendo.
    const iso = aIso(m);
    if (iso !== value) onChange(iso);
  };

  const abrirCalendario = () => {
    const el = nativo.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      // Navegador sin showPicker: el foco al menos deja usar el teclado.
      el.focus();
    }
  };

  const incompleto = texto.length > 0 && !aIso(texto);
  const alto = compact ? 34 : 44;

  return (
    <span
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minWidth: 0,
        border: `1px solid ${incompleto ? '#e2a294' : '#e0d6c4'}`,
        borderRadius: compact ? 12 : 14,
        background: '#fffdf8',
        minHeight: alto,
        padding: compact ? '0 4px 0 10px' : '0 6px 0 14px',
        ...style,
      }}
    >
      <input
        value={texto}
        onChange={(e) => escribir(e.target.value)}
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        aria-label={ariaLabel}
        aria-invalid={incompleto}
        style={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          border: 'none',
          background: 'none',
          outline: 'none',
          fontSize: compact ? 12 : 14,
          color: '#1a1a18',
          fontVariantNumeric: 'tabular-nums',
        }}
      />
      <button
        type="button"
        onClick={abrirCalendario}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label="Abrir calendario"
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: compact ? 26 : 30,
          height: compact ? 26 : 30,
          borderRadius: 9,
          border: 'none',
          background: hover ? '#f4f0e8' : 'transparent',
          color: '#6b665c',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <CalendarIcon size={compact ? 14 : 16} />
      </button>
      {/* Invisible pero con caja propia: `showPicker()` ancla el calendario a su
          posición, así que se lo deja pegado al botón que lo abre. */}
      <input
        ref={nativo}
        type="date"
        value={value}
        max={max}
        min={min}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => onChange(e.target.value)}
        style={{ position: 'absolute', right: 10, bottom: 0, width: 1, height: 1, opacity: 0, border: 'none', padding: 0, pointerEvents: 'none' }}
      />
    </span>
  );
}

function CalendarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

/** Va poniendo las barras a medida que se escribe, sin dejar tipear otra cosa. */
function maskear(txt: string): string {
  const d = txt.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + '/' + d.slice(2);
  return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
}

/** `dd/mm/aaaa` → ISO. Devuelve '' si está incompleta o no existe (31/02). */
function aIso(txt: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt);
  if (!m) return '';
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (d.getFullYear() !== Number(yyyy) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) return '';
  return `${yyyy}-${mm}-${dd}`;
}

/** ISO → `dd/mm/aaaa`. */
function deIso(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
