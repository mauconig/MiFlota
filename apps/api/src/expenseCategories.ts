/** Categorías válidas para un gasto suelto. Mismo set que `CATS` en el cliente:
 *  "Repuestos" ya no es una categoría suelta (cuenta como taller) y "Service" se
 *  renombró a "Mantenimiento". */
export const CATS_EGRESO = new Set(['Mantenimiento', 'Taller', 'Combustible', 'Seguro', 'Multas', 'Documentación', 'Otros']);

/** Categorías que ya no se ofrecen pero siguen llegando de clientes viejos. */
export const CATS_EGRESO_VIEJAS: Record<string, string> = {
  service: 'Mantenimiento',
  repuestos: 'Taller',
};

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const CANONICAS = new Map([...CATS_EGRESO].map((c) => [norm(c), c]));

/** Devuelve la categoría canónica sin importar mayúsculas ni acentos; los
 *  nombres viejos se traducen a los actuales. */
export const normalizarCategoria = (value: string) => {
  const trimmed = value.trim();
  return CATS_EGRESO_VIEJAS[trimmed.toLowerCase()] ?? CANONICAS.get(norm(trimmed)) ?? trimmed;
};

/** Tope de un gasto y de una carga desde el asistente. */
export const MAX_EGRESO_MONTO = 1_000_000_000;
export const MAX_EGRESO_LINEAS = 50;
