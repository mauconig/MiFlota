import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { generateFleetData } from './seed.js';

export const DB_PATH = process.env.MIFLOTA_DB ?? '/data/miflota.db';

export interface CarRow {
  id: string;
  owner_id: number;
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
      owner_id           INTEGER NOT NULL DEFAULT 0,
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
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id    INTEGER NOT NULL DEFAULT 0,
      car_id      TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      type        TEXT NOT NULL CHECK (type IN ('ingreso','egreso')),
      amount      INTEGER NOT NULL,
      date        TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      cat         TEXT,
      estado      TEXT CHECK (estado IN ('pagado','pendiente','parcial'))
    );

    CREATE INDEX IF NOT EXISTS idx_movs_car   ON movs(car_id);
    CREATE INDEX IF NOT EXISTS idx_movs_date  ON movs(date);
  `);

  // Los índices sobre owner_id se crean dentro de la migración, no acá: en una
  // base anterior la columna todavía no existe cuando corre este bloque.
  migrarOwner(db);
  return db;
}

/** Agrega `owner_id` a bases creadas antes de que la flota fuera por usuario.
 *  Las filas viejas quedan en 0, que no es de nadie, hasta que se reasignen. */
function migrarOwner(db: Database.Database) {
  const cols = (t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
  if (!cols('cars').includes('owner_id')) db.exec('ALTER TABLE cars ADD COLUMN owner_id INTEGER NOT NULL DEFAULT 0');
  if (!cols('movs').includes('owner_id')) db.exec('ALTER TABLE movs ADD COLUMN owner_id INTEGER NOT NULL DEFAULT 0');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cars_owner ON cars(owner_id); CREATE INDEX IF NOT EXISTS idx_movs_owner ON movs(owner_id);');
}

/** Reasigna toda la flota huérfana (owner_id = 0) a un usuario. */
export function adoptarHuerfanos(db: Database.Database, ownerId: number): number {
  const r = db.prepare('UPDATE cars SET owner_id = ? WHERE owner_id = 0').run(ownerId);
  db.prepare('UPDATE movs SET owner_id = ? WHERE owner_id = 0').run(ownerId);
  return r.changes;
}

/**
 * Siembra la flota de demostración para un usuario. Los ids de vehículo llevan
 * el owner adelante porque el generador siempre produce `c0…c14`: sin prefijo,
 * dos flotas sembradas chocarían en la clave primaria. Los ids de movimiento
 * los asigna SQLite, por el mismo motivo.
 */
export function sembrarFlota(db: Database.Database, ownerId: number): { cars: number; movs: number } {
  const { cars, movs } = generateFleetData();
  const idDe = (carId: string) => `u${ownerId}${carId}`;

  const insCar = db.prepare(`
    INSERT INTO cars (id, owner_id, plate, model, year, driver, cuota, estado, km, service_cada_meses, last_service_date, vtv_date, seguro_date)
    VALUES (@id, @owner_id, @plate, @model, @year, @driver, @cuota, @estado, @km, @service_cada_meses, @last_service_date, @vtv_date, @seguro_date)
  `);
  const insMov = db.prepare(`
    INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado)
    VALUES (@owner_id, @car_id, @type, @amount, @date, @descripcion, @cat, @estado)
  `);

  db.transaction(() => {
    for (const c of cars) {
      insCar.run({
        id: idDe(c.id),
        owner_id: ownerId,
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
        owner_id: ownerId,
        car_id: idDe(m.carId),
        type: m.type,
        amount: m.amount,
        date: iso(m.date),
        descripcion: m.desc,
        cat: m.cat ?? null,
        estado: m.estado ?? null,
      });
    }
  })();

  return { cars: cars.length, movs: movs.length };
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
