export const COLORS = {
  ink: '#16150f',
  amber: '#e8a13a',
  pos: '#2e7d5b',
  neg: '#c0553f',
  warn: '#c98a1e',
  paper: '#fffdf8',
} as const;

const now = new Date();
/** Fecha local del navegador, fijada al mediodía para que los cambios de zona
 * horaria no corran el día al convertirla en una fecha de negocio. */
export const TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function addD(base: Date, n: number): Date {
  return new Date(base.getTime() + n * 864e5);
}

export function addM(base: Date, n: number): Date {
  const d = new Date(base.getTime());
  d.setMonth(d.getMonth() + n);
  return d;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 864e5);
}

/** Duración en la unidad que se lee mejor: "12 días", "3 meses". */
export function durLbl(days: number): string {
  const d = Math.abs(Math.round(days));
  if (d < 45) return d + (d === 1 ? ' día' : ' días');
  const m = Math.round(d / 30);
  return m + (m === 1 ? ' mes' : ' meses');
}

/** `YYYY-MM-DD` en hora local, que es lo que espera y emite un <input type="date">. */
export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dLbl(d: Date): string {
  return d.getDate() + ' ' + MESES[d.getMonth()];
}

export function dLblFull(d: Date): string {
  return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear();
}

export function fmt(n: number, hide = false): string {
  if (hide) return '₲ ••••';
  return (n < 0 ? '−' : '') + '₲ ' + Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function fmtShort(n: number, hide = false): string {
  if (hide) return '•••';
  const a = Math.abs(n);
  const sg = n < 0 ? '−' : '';
  if (a >= 1e6) return sg + '₲' + (a / 1e6).toFixed(1).replace('.', ',') + 'M';
  if (a >= 1e3) return sg + '₲' + Math.round(a / 1e3) + 'k';
  return sg + '₲' + a;
}

export function initials(name: string): string {
  const p = String(name).trim().split(/\s+/);
  return ((p[0] || '')[0] || '?').toUpperCase() + ((p[1] || '')[0] || '').toUpperCase();
}

export function statusColor(net: number, umbralVerde: number): string {
  if (net <= 0) return COLORS.neg;
  if (net < umbralVerde) return COLORS.warn;
  return COLORS.pos;
}

export function numFromInput(v: string): number {
  return parseInt(String(v).replace(/[^0-9]/g, '') || '0', 10);
}

/** `400000` → `400.000`, para escribir montos. Descarta todo lo que no sea
 *  dígito, así que `numFromInput` sigue leyendo bien lo que produce. */
export function miles(v: string): string {
  const d = v.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function pct(n: number, d: number): string {
  return Math.round((n / d) * 100) + '%';
}
