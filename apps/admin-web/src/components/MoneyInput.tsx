import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { miles } from '../format';

/**
 * Campo de monto que va poniendo el punto de mil mientras se escribe.
 *
 * El motivo de que sea un componente y no un `onChange` con `miles()` es el
 * cursor: al insertar un punto, el valor controlado se reescribe y el navegador
 * manda el cursor al final. Escribiendo de corrido no se nota, pero corregir un
 * dígito en el medio se vuelve imposible. Acá se cuenta cuántos dígitos había a
 * la izquierda del cursor y se lo repone después del mismo dígito.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const cursor = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (cursor.current === null || !ref.current) return;
    ref.current.setSelectionRange(cursor.current, cursor.current);
    cursor.current = null;
  });

  const escribir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const crudo = e.target.value;
    const digitosAntes = crudo.slice(0, e.target.selectionStart ?? crudo.length).replace(/\D/g, '').length;
    const formateado = miles(crudo);
    cursor.current = trasDigito(formateado, digitosAntes);
    onChange(formateado);
  };

  return <input ref={ref} value={value} onChange={escribir} inputMode="numeric" placeholder={placeholder} aria-label={ariaLabel} style={style} />;
}

/** Posición en `s` justo después del dígito número `n`. */
function trasDigito(s: string, n: number): number {
  if (n <= 0) return 0;
  let vistos = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] >= '0' && s[i] <= '9' && ++vistos === n) return i + 1;
  }
  return s.length;
}
