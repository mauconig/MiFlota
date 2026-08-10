import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { generateFleetData } from './seed.js';

export const DB_PATH = process.env.MIFLOTA_DB ?? '/data/miflota.db';

export interface CarRow {
  id: string;
  plate: string;
  model: string;
  year: number;
  driver: string;
  cuota: number;
  estado: string;
  km: number;
  service_cada_meses: number;
  last_service_date: string;
  vtv_date: string;
  seguro_date: string;
}

export interface MovRow {
  id: number;
  car_id: string;
  type: string;
  amount: number;
  date: string;
  descripcion: string;
  cat: string | null;
  estado: string | null;
}

/** Las fechas viajan como ISO `YYYY-MM-DD`: ordenan lexicográficamente en SQL y
 *  no arrastran zona horaria, que es la principal fuente de corrimientos de un día. */
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function openDb() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS cars (
      id                 TEXT PRIMARY KEY,
      plate              TEXT NOT NULL,
      model              TEXT NOT NULL,
      year               INTEGER NOT NULL,
      driver             TEXT NOT NULL DEFAULT 'Sin chofer',
      cuota              INTEGER NOT NULL DEFAULT 0,
      estado             TEXT NOT NULL CHECK (estado IN ('activo','taller','baja')),
      km                 INTEGER NOT NULL DEFAULT 0,
      service_cada_meses INTEGER NOT NULL DEFAULT 6,
      last_service_date  TEXT NOT NULL,
      vtv_date           TEXT NOT NULL,
      seguro_date        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movs (
      id          INTEGER PRIMARY KEY,
      car_id      TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      type        TEXT NOT NULL CHECK (type IN ('ingreso','egreso')),
      amount      INTEGER NOT NULL,
      date        TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      cat         TEXT,
      estado      TEXT CHECK (estado IN ('pagado','pendiente','parcial'))
    );

    CREATE INDEX IF NOT EXISTS idx_movs_car  ON movs(car_id);
    CREATE INDEX IF NOT EXISTS idx_movs_date ON movs(date);
  `);

  return db;
}

/** Siembra la flota de demostración solo si la base está vacía, para que un
 *  reinicio del contenedor nunca pise datos reales. */
export function seedIfEmpty(db: Database.Database): boolean {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM cars').get() as { n: number };
  if (n > 0) return false;

  const { cars, movs } = generateFleetData();
  const insCar = db.prepare(`
    INSERT INTO cars (id, plate, model, year, driver, cuota, estado, km, service_cada_meses, last_service_date, vtv_date, seguro_date)
    VALUES (@id, @plate, @model, @year, @driver, @cuota, @estado, @km, @service_cada_meses, @last_service_date, @vtv_date, @seguro_date)
  `);
  const insMov = db.prepare(`
    INSERT INTO movs (id, car_id, type, amount, date, descripcion, cat, estado)
    VALUES (@id, @car_id, @type, @amount, @date, @descripcion, @cat, @estado)
  `);

  db.transaction(() => {
    for (const c of cars) {
      insCar.run({
        id: c.id,
        plate: c.plate,
        model: c.model,
        year: c.year,
        driver: c.driver,
        cuota: c.cuota,
        estado: c.estado,
        km: c.km,
        service_cada_meses: c.serviceCadaMeses,
        last_service_date: iso(c.lastServiceDate),
        vtv_date: iso(c.vtvDate),
        seguro_date: iso(c.seguroDate),
      });
    }
    for (const m of movs) {
      insMov.run({
        id: m.id,
        car_id: m.carId,
        type: m.type,
        amount: m.amount,
        date: iso(m.date),
        descripcion: m.desc,
        cat: m.cat ?? null,
        estado: m.estado ?? null,
      });
    }
  })();

  return true;
}

/** Forma en la que el frontend consume un vehículo. */
export function carToJson(r: CarRow) {
  return {
    id: r.id,
    plate: r.plate,
    model: r.model,
    year: r.year,
    driver: r.driver,
    cuota: r.cuota,
    estado: r.estado,
    km: r.km,
    serviceCadaMeses: r.service_cada_meses,
    lastServiceDate: r.last_service_date,
    vtvDate: r.vtv_date,
    seguroDate: r.seguro_date,
  };
}

export function movToJson(r: MovRow) {
  return {
    id: r.id,
    carId: r.car_id,
    type: r.type,
    amount: r.amount,
    date: r.date,
    desc: r.descripcion,
    ...(r.cat ? { cat: r.cat } : {}),
    ...(r.estado ? { estado: r.estado } : {}),
  };
}
