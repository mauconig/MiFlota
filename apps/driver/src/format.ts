const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const fmtG = (n: number) => Math.round(n).toLocaleString('de-DE') + ' Gs';

/** Fechas del servidor llegan como 'YYYY-MM-DD': se parsean a mediodía local
 *  para que no se corran un día por huso horario. */
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const fmtD = (iso: string) => {
  const d = parseISO(iso);
  return d.getDate() + ' ' + MES[d.getMonth()];
};

const fmtLongDate = (d: Date) => DIA[d.getDay()] + ' ' + d.getDate() + ' de ' + MESL[d.getMonth()];

export const fmtLong = (iso: string) => fmtLongDate(parseISO(iso));

/** Fecha de hoy tal cual la ve el teléfono — solo para el encabezado, no
 *  para ninguna cuenta (eso lo resuelve /api/chofer/resumen del lado del
 *  servidor, alineado a MIFLOTA_HOY). */
export const fmtHoy = () => fmtLongDate(new Date());

export const mesLabel = (iso: string) => {
  const d = parseISO(iso);
  const m = MESL[d.getMonth()];
  return m[0].toUpperCase() + m.slice(1);
};

export const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
