const DEFAULT_TIME_ZONE = 'America/Asuncion';

function validTimeZone(value: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Zona horaria de negocio: las fechas de la flota se interpretan en este huso. */
export const APP_TIME_ZONE = validTimeZone(process.env.MIFLOTA_TIME_ZONE ?? DEFAULT_TIME_ZONE);

export interface LocalDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Devuelve la fecha/hora civil de una instancia en la zona de negocio. */
export function localDateTime(date = new Date(), timeZone = APP_TIME_ZONE): LocalDateTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour'), minute: value('minute') };
}

export function localDateISO(date = new Date(), timeZone = APP_TIME_ZONE): string {
  const d = localDateTime(date, timeZone);
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}
