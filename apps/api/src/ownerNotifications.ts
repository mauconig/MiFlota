import type Database from 'better-sqlite3';
import type { CarRow } from './db.js';
import { APP_TIME_ZONE, localDateTime } from './time.js';
import { sendOwnerPush, type OwnerPushMessage } from './push.js';

const SERVICE_NOTICE_DAYS = 15;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface OwnerAlertDigestItem {
  carId: string;
  plate: string;
  kind: 'Service' | 'Seguro' | 'Taller' | 'Kilometraje';
  text: string;
  severity: number;
}

function parseISO(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatISO(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function addDays(value: string, days: number): string | null {
  const date = parseISO(value);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return formatISO(date);
}

function addMonths(value: string, months: number): string | null {
  const date = parseISO(value);
  if (!date) return null;
  date.setUTCMonth(date.getUTCMonth() + months);
  return formatISO(date);
}

function daysBetween(from: string, to: string): number {
  const start = parseISO(from);
  const end = parseISO(to);
  if (!start || !end) return Number.POSITIVE_INFINITY;
  return Math.round((end.getTime() - start.getTime()) / 864e5);
}

/** Misma definición que la pantalla Alertas de Admin Mobile. */
export function buildOwnerAlertDigest(cars: CarRow[], today: string): OwnerAlertDigestItem[] {
  const items: OwnerAlertDigestItem[] = [];
  for (const car of cars) {
    if (car.estado === 'baja') continue;

    if (car.service_cada > 0 && car.last_service_date) {
      const next = car.service_unidad === 'dias' ? addDays(car.last_service_date, car.service_cada) : addMonths(car.last_service_date, car.service_cada);
      if (next) {
        const daysLeft = daysBetween(today, next);
        if (daysLeft <= SERVICE_NOTICE_DAYS) {
          const text = daysLeft < 0 ? `Service vencido hace ${Math.abs(daysLeft)} días` : daysLeft === 0 ? 'Service vence hoy' : `Service vence en ${daysLeft} días`;
          items.push({ carId: car.id, plate: car.plate, kind: 'Service', text, severity: daysLeft < 0 ? 2 : 1 });
        }
      }
    }

    if (car.seguro_cada > 0 && car.seguro_nombre.trim() && car.seguro_date === today) {
      items.push({ carId: car.id, plate: car.plate, kind: 'Seguro', text: 'Seguro vence hoy', severity: 1 });
    }
    if (car.estado === 'taller') {
      items.push({ carId: car.id, plate: car.plate, kind: 'Taller', text: 'Vehículo en taller', severity: 1 });
    }

    const daysSinceUpdate = car.kilometraje_actualizado ? daysBetween(car.kilometraje_actualizado, today) : Number.POSITIVE_INFINITY;
    if (!car.kilometraje_actualizado || daysSinceUpdate > 7) {
      items.push({ carId: car.id, plate: car.plate, kind: 'Kilometraje', text: car.kilometraje ? 'Kilometraje pendiente' : 'Falta cargar kilometraje', severity: 1 });
    }
  }
  return items.sort((a, b) => b.severity - a.severity || a.plate.localeCompare(b.plate));
}

export interface DailyDigestLogger {
  info: (data: object, message: string) => void;
  warn: (data: object, message: string) => void;
}

export interface DailyDigestOptions {
  now?: () => Date;
  timeZone?: string;
  send?: (db: Database.Database, ownerId: number, message: OwnerPushMessage) => Promise<number>;
  logger?: DailyDigestLogger;
}

export interface DailyDigestResult {
  day: string | null;
  owners: number;
  sent: number;
  skipped: number;
  failed: number;
}

/** Ejecuta como máximo un resumen por dueño y fecha civil. */
export async function runDailyAlertDigest(db: Database.Database, options: DailyDigestOptions = {}): Promise<DailyDigestResult> {
  const now = options.now?.() ?? new Date();
  const timeZone = options.timeZone ?? APP_TIME_ZONE;
  const current = localDateTime(now, timeZone);
  const day = `${current.year}-${String(current.month).padStart(2, '0')}-${String(current.day).padStart(2, '0')}`;
  const result: DailyDigestResult = { day: null, owners: 0, sent: 0, skipped: 0, failed: 0 };
  if (current.hour < 8) return result;
  result.day = day;

  const owners = db.prepare('SELECT DISTINCT owner_id FROM admin_push_tokens ORDER BY owner_id').all() as { owner_id: number }[];
  result.owners = owners.length;
  const claim = db.prepare('INSERT OR IGNORE INTO admin_alert_digest_log (owner_id, day, sent_at) VALUES (?, ?, ?)');
  const release = db.prepare('DELETE FROM admin_alert_digest_log WHERE owner_id = ? AND day = ?');
  const cars = db.prepare('SELECT * FROM cars WHERE owner_id = ? ORDER BY rowid');
  const send = options.send ?? sendOwnerPush;

  for (const { owner_id: ownerId } of owners) {
    if (claim.run(ownerId, day, new Date().toISOString()).changes === 0) {
      result.skipped += 1;
      continue;
    }
    const alerts = buildOwnerAlertDigest(cars.all(ownerId) as CarRow[], day);
    if (!alerts.length) continue;

    const details = alerts.slice(0, 3).map((alert) => `${alert.plate}: ${alert.text}`);
    const message: OwnerPushMessage = {
      title: `${alerts.length} alerta${alerts.length === 1 ? '' : 's'} pendiente${alerts.length === 1 ? '' : 's'}`,
      body: details.join(' · ') + (alerts.length > 3 ? ` · +${alerts.length - 3} más` : ''),
      data: { type: 'daily_alert_digest', count: alerts.length, day },
    };
    try {
      await send(db, ownerId, message);
      result.sent += 1;
      options.logger?.info({ ownerId, day, count: alerts.length }, 'resumen diario de alertas enviado');
    } catch (error) {
      release.run(ownerId, day);
      result.failed += 1;
      options.logger?.warn({ err: error, ownerId, day }, 'no se pudo enviar resumen diario de alertas');
    }
  }
  return result;
}

export function startDailyAlertDigest(db: Database.Database, logger: DailyDigestLogger, options: Pick<DailyDigestOptions, 'timeZone' | 'now'> = {}): () => void {
  let running = false;
  let stopped = false;
  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await runDailyAlertDigest(db, { ...options, logger });
    } catch (error) {
      logger.warn({ err: error }, 'falló el scheduler de alertas diarias');
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 60_000);
  void tick();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
