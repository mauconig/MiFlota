import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generateFleetData } from './seed.js';

export const DB_PATH = process.env.MIFLOTA_DB ?? '/data/miflota.db';

/** Los comprobantes van al lado de la base, que es el volumen persistente:
 *  si quedaran en la imagen, se perderían en cada reconstrucción. */
export const COMPROBANTES_DIR = process.env.MIFLOTA_COMPROBANTES ?? join(dirname(DB_PATH), 'comprobantes');

export interface CarRow {
  id: string;
  owner_id: number;
  plate: string;
  model: string;
  year: number;
  driver: string;
  cuota: number;
  estado: string;
  gps_tag: string;
  service_cada: number;
  service_unidad: string;
  last_service_date: string;
  seguro_date: string;
  seguro_costo: number;
  seguro_periodo: string;
  seguro_cada: number;
}

export interface MovRow {
  id: number;
  car_id: string;
  type: string;
  /** Lo facturado. En un ingreso es la cuota emitida, se haya cobrado o no. */
  amount: number;
  /** Lo que efectivamente entró. Null en los egresos, que no se cobran. */
  cobrado: number | null;
  date: string;
  descripcion: string;
  cat: string | null;
  estado: string | null;
  /** Id del archivo en COMPROBANTES_DIR. Null = el movimiento no tiene adjunto. */
  comprobante: string | null;
  /** Nombre original, solo para mostrar y para la descarga. */
  comprobante_nombre: string | null;
  comprobante_tipo: string | null;
}

/** Las fechas viajan como ISO `YYYY-MM-DD`: ordenan lexicográficamente en SQL y
 *  no arrastran zona horaria, que es la principal fuente de corrimientos de un día. */
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function openDb() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  mkdirSync(COMPROBANTES_DIR, { recursive: true });
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
      gps_tag            TEXT NOT NULL DEFAULT '',
      service_cada       INTEGER NOT NULL DEFAULT 6,
      service_unidad     TEXT NOT NULL DEFAULT 'meses' CHECK (service_unidad IN ('dias','meses')),
      last_service_date  TEXT NOT NULL,
      seguro_date        TEXT NOT NULL,
      seguro_costo       INTEGER NOT NULL DEFAULT 0,
      seguro_periodo     TEXT NOT NULL DEFAULT 'mensual' CHECK (seguro_periodo IN ('mensual','anual')),
      seguro_cada        INTEGER NOT NULL DEFAULT 12
    );

    CREATE TABLE IF NOT EXISTS movs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id    INTEGER NOT NULL DEFAULT 0,
      car_id      TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      type        TEXT NOT NULL CHECK (type IN ('ingreso','egreso')),
      amount      INTEGER NOT NULL,
      cobrado     INTEGER,
      date        TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      cat         TEXT,
      estado      TEXT CHECK (estado IN ('pagado','pendiente','parcial')),
      comprobante        TEXT,
      comprobante_nombre TEXT,
      comprobante_tipo   TEXT
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
  // El kilometraje dejó de usarse: ya no lo pide el alta ni lo muestra ninguna
  // pantalla, y mantenerlo al día era trabajo manual sin nada que lo consuma.
  if (cols('cars').includes('km')) db.exec('ALTER TABLE cars DROP COLUMN km');
  // El intervalo de service deja de ser siempre en meses: pasa a valor + unidad.
  // Las filas viejas eran meses por definición, así que se copian tal cual.
  if (!cols('cars').includes('gps_tag')) db.exec("ALTER TABLE cars ADD COLUMN gps_tag TEXT NOT NULL DEFAULT ''");
  // La cuota es lo que paga el chofer: un vehículo sin chofer no puede tener una.
  // Normaliza las filas que quedaron así cuando la cuota se cargaba en el alta.
  db.exec("UPDATE cars SET cuota = 0 WHERE driver = 'Sin chofer' AND cuota > 0");
  if (!cols('cars').includes('service_cada')) {
    db.exec("ALTER TABLE cars ADD COLUMN service_cada INTEGER NOT NULL DEFAULT 6");
    db.exec("ALTER TABLE cars ADD COLUMN service_unidad TEXT NOT NULL DEFAULT 'meses'");
    if (cols('cars').includes('service_cada_meses')) {
      db.exec('UPDATE cars SET service_cada = service_cada_meses');
      db.exec('ALTER TABLE cars DROP COLUMN service_cada_meses');
    }
  }
  // La VTV es de otro país: acá no se controla nada equivalente, así que la
  // fecha no representaba ninguna obligación real. Se va con su alerta.
  if (cols('cars').includes('vtv_date')) db.exec('ALTER TABLE cars DROP COLUMN vtv_date');
  // El seguro pasa a tener costo e intervalo propio de renovación: antes se
  // renovaba siempre "12 meses desde hoy" y no se sabía cuánto costaba.
  // Comprobante del gasto. El archivo vive en disco; acá solo queda el id con
  // el que se lo busca, más el nombre y el tipo para servirlo.
  if (!cols('movs').includes('comprobante')) {
    db.exec('ALTER TABLE movs ADD COLUMN comprobante TEXT');
    db.exec('ALTER TABLE movs ADD COLUMN comprobante_nombre TEXT');
    db.exec('ALTER TABLE movs ADD COLUMN comprobante_tipo TEXT');
  }
  if (!cols('cars').includes('seguro_costo')) {
    db.exec('ALTER TABLE cars ADD COLUMN seguro_costo INTEGER NOT NULL DEFAULT 0');
    db.exec("ALTER TABLE cars ADD COLUMN seguro_periodo TEXT NOT NULL DEFAULT 'mensual'");
    db.exec('ALTER TABLE cars ADD COLUMN seguro_cada INTEGER NOT NULL DEFAULT 12');
    // Los vehículos de la flota de demostración llevan el costo que les habría
    // puesto el generador. A los cargados por una persona no se les inventa
    // ninguno: quedan en 0 y la ficha los muestra como "sin costo cargado".
    //
    // Un id sembrado es `c0…c14` (flota original, adoptada) o `u<dueño>c<n>`
    // (siembras posteriores). Un id creado desde el alta es 'c' + timestamp en
    // base 36, que siempre sigue con una letra: por eso el `[0-9]` alcanza para
    // distinguirlos.
    db.exec(`
      UPDATE cars
         SET seguro_costo = 400000 + ((CAST(substr(id, instr(id,'c') + 1) AS INTEGER) * 17) % 12) * 10000
       WHERE seguro_costo = 0
         AND (id GLOB 'u*c*' OR id GLOB 'c[0-9]' OR id GLOB 'c[0-9][0-9]')
    `);
  }
  // Antes `amount` significaba dos cosas distintas según el estado: en un cobro
  // pagado era la plata que entró, en uno pendiente la que se esperaba, y en uno
  // parcial la mitad que se pagó. Así no se podía decir cuánto debía un chofer.
  // Ahora `amount` es siempre lo facturado y `cobrado` lo que efectivamente
  // entró, que es la resta que da la deuda.
  if (!cols('movs').includes('cobrado')) {
    db.exec('ALTER TABLE movs ADD COLUMN cobrado INTEGER');
    db.exec("UPDATE movs SET cobrado = amount WHERE type = 'ingreso' AND estado = 'pagado'");
    db.exec("UPDATE movs SET cobrado = 0      WHERE type = 'ingreso' AND estado = 'pendiente'");
    // El parcial guardaba solo lo pagado. Todos salieron del generador, que los
    // arma como la mitad de la cuota (`cuota * 3 * 0.5`), así que el doble
    // reconstruye exacto lo facturado. Se usa eso y no la cuota actual del
    // vehículo, que pudo haberse editado después de emitido el cobro.
    db.exec("UPDATE movs SET cobrado = amount, amount = amount * 2 WHERE type = 'ingreso' AND estado = 'parcial'");
  }
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
    INSERT INTO cars (id, owner_id, plate, model, year, driver, cuota, estado, gps_tag, service_cada, service_unidad, last_service_date, seguro_date, seguro_costo, seguro_periodo, seguro_cada)
    VALUES (@id, @owner_id, @plate, @model, @year, @driver, @cuota, @estado, @gps_tag, @service_cada, @service_unidad, @last_service_date, @seguro_date, @seguro_costo, @seguro_periodo, @seguro_cada)
  `);
  const insMov = db.prepare(`
    INSERT INTO movs (owner_id, car_id, type, amount, cobrado, date, descripcion, cat, estado)
    VALUES (@owner_id, @car_id, @type, @amount, @cobrado, @date, @descripcion, @cat, @estado)
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
        gps_tag: c.gpsTag,
        service_cada: c.serviceCadaMeses,
        service_unidad: 'meses',
        last_service_date: iso(c.lastServiceDate),
        seguro_date: iso(c.seguroDate),
        seguro_costo: c.seguroCosto,
        seguro_periodo: 'mensual',
        seguro_cada: 12,
      });
    }
    for (const m of movs) {
      insMov.run({
        owner_id: ownerId,
        car_id: idDe(m.carId),
        type: m.type,
        amount: m.amount,
        cobrado: m.cobrado ?? null,
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
    gpsTag: r.gps_tag,
    serviceCada: r.service_cada,
    serviceUnidad: r.service_unidad,
    lastServiceDate: r.last_service_date,
    seguroDate: r.seguro_date,
    seguroCosto: r.seguro_costo,
    seguroPeriodo: r.seguro_periodo,
    seguroCada: r.seguro_cada,
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
    // `amount` es lo facturado y `cobrado` lo que entró; la resta es la deuda.
    // Solo va en los ingresos: un egreso no se "cobra".
    ...(r.cobrado === null ? {} : { cobrado: r.cobrado }),
    ...(r.cat ? { cat: r.cat } : {}),
    ...(r.estado ? { estado: r.estado } : {}),
    // El cliente nunca ve la ruta del archivo, solo si hay uno y cómo se llama.
    ...(r.comprobante ? { comprobante: { id: r.comprobante, nombre: r.comprobante_nombre ?? 'comprobante', tipo: r.comprobante_tipo ?? '' } } : {}),
  };
}
