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
  /** Identidad estable del chofer. Null = 'Sin chofer'. El nombre va aparte
   *  en `driver` como copia para mostrar, pero la relación y la historia viajan
   *  por acá: así un chofer conserva su historial aunque cambie de vehículo. */
  driver_id: number | null;
  driver: string;
  cuota: number;
  estado: string;
  gps_tag: string;
  service_cada: number;
  service_unidad: string;
  last_service_date: string;
  kilometraje: number;
  kilometraje_actualizado: string | null;
  seguro_date: string;
  seguro_costo: number;
  seguro_periodo: string;
  seguro_nombre: string;
  seguro_cada: number;
  /** Credenciales para entrar a apps/driver. Nulas hasta que el dueño las
   *  genera; nunca se exponen en carToJson. */
  driver_username: string | null;
  driver_pass_hash: string | null;
}

export interface MovRow {
  id: number;
  car_id: string;
  type: string;
  /** Lo facturado. En un ingreso es la cuota emitida, se haya cobrado o no.
   *  Cuánto se cobró de ella no vive acá: sale de imputar los pagos (ver
   *  `pagos` y la imputación FIFO del cliente). */
  amount: number;
  date: string;
  descripcion: string;
  cat: string | null;
  estado: string | null;
  /** Chofer al que corresponde el cobro. Null = usar el chofer actual del
   *  auto (movimientos viejos, o egresos que no llevan chofer). */
  driver: string | null;
  /** Identidad estable del chofer (FK a drivers). Null = 'Sin chofer'. */
  driver_id: number | null;
  /** Id del archivo en COMPROBANTES_DIR. Null = el movimiento no tiene adjunto. */
  comprobante: string | null;
  /** Nombre original, solo para mostrar y para la descarga. */
  comprobante_nombre: string | null;
  comprobante_tipo: string | null;
  mano_obra: number;
}

export interface GastoItemRow {
  id: number;
  mov_id: number;
  nombre: string;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
}

/**
 * Un asiento a favor del chofer. No se ata a una cuota concreta: se imputa a lo
 * que debe, de lo más viejo a lo más nuevo, en el momento de leer. Así un pago
 * conserva su fecha real —que es la que manda para la caja— sin que eso mueva
 * la fecha de la cuota que cancela.
 */
export interface PagoRow {
  id: number;
  owner_id: number;
  /** Auto en el que andaba el chofer al pagar. Solo referencia: la imputación
   *  es por chofer, porque la deuda lo sigue a él aunque cambie de vehículo. */
  car_id: string | null;
  driver: string;
  /** Identidad estable del chofer (FK a drivers). Null en pagos migrados que no
   *  pudieron resolverse a una fila de drivers. */
  driver_id: number | null;
  fecha: string;
  monto: number;
  /** `pago` entró plata de verdad; `ajuste` cancela deuda sin caja (una
   *  condonación). Mezclarlos infla los ingresos, por eso van separados. */
  tipo: string;
  medio: string | null;
  nota: string | null;
  comprobante: string | null;
  comprobante_nombre: string | null;
  comprobante_tipo: string | null;
}

/** Un reporte de falla que un chofer manda desde apps/driver. Pensado para
 *  poder mezclarse a futuro en el mismo `alertList` que ya arma Service/
 *  Seguro/Taller (ver useFleetView.ts) — por eso `estado` deja lugar para que
 *  el dueño lo vaya moviendo, aunque hoy nada todavía lo cambia de 'enviada'. */
export interface ReporteRow {
  id: number;
  owner_id: number;
  car_id: string;
  driver: string;
  /** Identidad estable del chofer (FK a drivers). */
  driver_id: number | null;
  cat: string;
  urgencia: string;
  texto: string;
  estado: string;
  fecha: string;
}

export interface LocationRow {
  car_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
  received_at: string;
  mocked: number;
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
    -- Identidad estable del chofer, separada del vehículo. Antes el nombre y
    -- las credenciales vivían en cars; al cambiar de auto el chofer perdía
    -- login e historia. Ahora la persona existe acá y el auto solo la
    -- referencia, así conserva ambas al rotar de vehículo.
    CREATE TABLE IF NOT EXISTS drivers (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id          INTEGER NOT NULL DEFAULT 0,
      nombre            TEXT NOT NULL CHECK (length(nombre) > 0 AND length(nombre) <= 80),
      estado            TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','baja')),
      driver_username   TEXT,
      driver_pass_hash  TEXT,
      creado            TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_drivers_owner ON drivers(owner_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_username ON drivers(driver_username) WHERE driver_username IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_owner_nombre ON drivers(owner_id, nombre);

    CREATE TABLE IF NOT EXISTS cars (
      id                 TEXT PRIMARY KEY,
      owner_id           INTEGER NOT NULL DEFAULT 0,
      plate              TEXT NOT NULL,
      model              TEXT NOT NULL,
      year               INTEGER NOT NULL,
      driver_id          INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
      driver             TEXT NOT NULL DEFAULT 'Sin chofer',
      cuota              INTEGER NOT NULL DEFAULT 0,
      estado             TEXT NOT NULL CHECK (estado IN ('activo','taller','baja')),
      gps_tag            TEXT NOT NULL DEFAULT '',
      service_cada       INTEGER NOT NULL DEFAULT 6,
      service_unidad     TEXT NOT NULL DEFAULT 'meses' CHECK (service_unidad IN ('dias','meses')),
      last_service_date  TEXT NOT NULL DEFAULT '',
      kilometraje        INTEGER NOT NULL DEFAULT 0,
      kilometraje_actualizado TEXT,
      seguro_date        TEXT NOT NULL DEFAULT '',
      seguro_costo       INTEGER NOT NULL DEFAULT 0,
      seguro_periodo     TEXT NOT NULL DEFAULT 'mensual' CHECK (seguro_periodo IN ('mensual','anual')),
      seguro_nombre      TEXT NOT NULL DEFAULT '',
      seguro_cada        INTEGER NOT NULL DEFAULT 12
    );

    CREATE TABLE IF NOT EXISTS kilometraje_alertas (
      owner_id       INTEGER NOT NULL,
      car_id         TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      notified_date  TEXT NOT NULL,
      PRIMARY KEY (owner_id, car_id, notified_date)
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
      estado      TEXT CHECK (estado IN ('pagado','pendiente','parcial')),
      driver      TEXT,
      driver_id   INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
      mano_obra   INTEGER NOT NULL DEFAULT 0,
      comprobante        TEXT,
      comprobante_nombre TEXT,
      comprobante_tipo   TEXT
    );

    CREATE TABLE IF NOT EXISTS gasto_items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      mov_id          INTEGER NOT NULL REFERENCES movs(id) ON DELETE CASCADE,
      nombre          TEXT NOT NULL CHECK (length(nombre) > 0 AND length(nombre) <= 120),
      cantidad        REAL NOT NULL CHECK (cantidad > 0),
      costo_unitario  INTEGER NOT NULL CHECK (costo_unitario > 0),
      subtotal        INTEGER NOT NULL CHECK (subtotal > 0)
    );

    CREATE TABLE IF NOT EXISTS pagos (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL DEFAULT 0,
      car_id   TEXT REFERENCES cars(id) ON DELETE SET NULL,
      driver   TEXT NOT NULL,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
      fecha    TEXT NOT NULL,
      monto    INTEGER NOT NULL CHECK (monto > 0),
      tipo     TEXT NOT NULL DEFAULT 'pago' CHECK (tipo IN ('pago','ajuste')),
      medio    TEXT,
      nota     TEXT
    );

    -- Reportes de falla que un chofer manda desde apps/driver. El estado queda
    -- listo para que el dueño lo mueva (vista/en_taller/resuelta) el día que
    -- admin-web los muestre, aunque hoy nada todavía lo hace avanzar.
    CREATE TABLE IF NOT EXISTS reportes_falla (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      car_id   TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      driver   TEXT NOT NULL,
      driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
      cat      TEXT NOT NULL,
      urgencia TEXT NOT NULL CHECK (urgencia IN ('puedo','urgente')),
      texto    TEXT NOT NULL,
      estado   TEXT NOT NULL DEFAULT 'enviada' CHECK (estado IN ('enviada','vista','en_taller','resuelta')),
      fecha    TEXT NOT NULL
    );

    -- Ultima posicion conocida del auto. Se conserva una sola fila por auto:
    -- el historial de recorridos no forma parte aun del dominio de la app.
    CREATE TABLE IF NOT EXISTS driver_locations (
      car_id       TEXT PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
      latitude     REAL NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
      longitude    REAL NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
      accuracy     REAL CHECK (accuracy IS NULL OR accuracy >= 0),
      recorded_at  TEXT NOT NULL,
      received_at  TEXT NOT NULL,
      mocked       INTEGER NOT NULL DEFAULT 0 CHECK (mocked IN (0, 1))
    );

    -- Tokens Expo Push del panel del dueño. Un mismo dispositivo puede
    -- registrarse varias veces (por reinstalación o renovación del token),
    -- pero cada token queda asociado a un único dueño.
    CREATE TABLE IF NOT EXISTS admin_push_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id    INTEGER NOT NULL,
      token       TEXT NOT NULL UNIQUE,
      platform    TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    -- Deduplicación persistente del resumen diario de alertas del dueño.
    CREATE TABLE IF NOT EXISTS admin_alert_digest_log (
      owner_id INTEGER NOT NULL,
      day      TEXT NOT NULL,
      sent_at  TEXT NOT NULL,
      PRIMARY KEY (owner_id, day)
    );

    -- Banderas de migraciones que corren una sola vez en la vida de la base.
    -- No usar la ausencia/presencia de una columna como guard cuando la propia
    -- migración la borra: en el siguiente arranque la columna vuelve a estar
    -- ausente y el bloque entero se repite (pasó con 'cobrado', ver abajo).
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_movs_car       ON movs(car_id);
    CREATE INDEX IF NOT EXISTS idx_movs_date      ON movs(date);
    CREATE INDEX IF NOT EXISTS idx_gasto_items_mov ON gasto_items(mov_id);
    CREATE INDEX IF NOT EXISTS idx_pagos_owner    ON pagos(owner_id);
    CREATE INDEX IF NOT EXISTS idx_pagos_drv      ON pagos(driver);
    CREATE INDEX IF NOT EXISTS idx_reportes_owner ON reportes_falla(owner_id);
    CREATE INDEX IF NOT EXISTS idx_reportes_car   ON reportes_falla(car_id);
    CREATE INDEX IF NOT EXISTS idx_driver_locations_received ON driver_locations(received_at);
    CREATE INDEX IF NOT EXISTS idx_admin_push_tokens_owner ON admin_push_tokens(owner_id);
    CREATE INDEX IF NOT EXISTS idx_admin_alert_digest_log_day ON admin_alert_digest_log(day);
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
  const tableExists = (t: string) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
  if (!cols('cars').includes('owner_id')) db.exec('ALTER TABLE cars ADD COLUMN owner_id INTEGER NOT NULL DEFAULT 0');
  if (!cols('movs').includes('owner_id')) db.exec('ALTER TABLE movs ADD COLUMN owner_id INTEGER NOT NULL DEFAULT 0');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cars_owner ON cars(owner_id); CREATE INDEX IF NOT EXISTS idx_movs_owner ON movs(owner_id);');
  // El kilometraje dejó de usarse: ya no lo pide el alta ni lo muestra ninguna
  // pantalla, y mantenerlo al día era trabajo manual sin nada que lo consuma.
  if (cols('cars').includes('km') && !cols('cars').includes('kilometraje')) db.exec('ALTER TABLE cars RENAME COLUMN km TO kilometraje');
  if (!cols('cars').includes('kilometraje')) db.exec('ALTER TABLE cars ADD COLUMN kilometraje INTEGER NOT NULL DEFAULT 0');
  if (!cols('cars').includes('kilometraje_actualizado')) db.exec('ALTER TABLE cars ADD COLUMN kilometraje_actualizado TEXT');
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
  if (!cols('cars').includes('seguro_nombre')) db.exec("ALTER TABLE cars ADD COLUMN seguro_nombre TEXT NOT NULL DEFAULT ''");
  if (!cols('movs').includes('mano_obra')) db.exec('ALTER TABLE movs ADD COLUMN mano_obra INTEGER NOT NULL DEFAULT 0');
  db.exec(`
    CREATE TABLE IF NOT EXISTS gasto_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mov_id INTEGER NOT NULL REFERENCES movs(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL CHECK (length(nombre) > 0 AND length(nombre) <= 120),
      cantidad REAL NOT NULL CHECK (cantidad > 0),
      costo_unitario INTEGER NOT NULL CHECK (costo_unitario > 0),
      subtotal INTEGER NOT NULL CHECK (subtotal > 0)
    );
    CREATE INDEX IF NOT EXISTS idx_gasto_items_mov ON gasto_items(mov_id);
    CREATE TABLE IF NOT EXISTS kilometraje_alertas (
      owner_id INTEGER NOT NULL,
      car_id TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      notified_date TEXT NOT NULL,
      PRIMARY KEY (owner_id, car_id, notified_date)
    );
  `);

  // Chofer al que corresponde cada cobro. Null en las filas viejas: el
  // chofer actual del auto sigue siendo el valor por defecto para esas, así
  // que la migración no necesita rellenarlas.
  if (!cols('movs').includes('driver')) db.exec('ALTER TABLE movs ADD COLUMN driver TEXT');

  // Credenciales del chofer para entrar a apps/driver. Nulas hasta que el
  // dueño las genera con POST /api/cars/:id/chofer-credenciales: un auto
  // recién creado, o sin chofer, no tiene con qué entrar.
  if (!cols('cars').includes('driver_username')) {
    db.exec('ALTER TABLE cars ADD COLUMN driver_username TEXT');
    db.exec('ALTER TABLE cars ADD COLUMN driver_pass_hash TEXT');
    // SQLite no permite UNIQUE en un ALTER TABLE ADD COLUMN: va como índice
    // parcial aparte. Parcial porque el login del chofer busca por usuario
    // solo (no conoce su owner_id) y necesita que alcance para identificar
    // una fila en toda la base; NULL no cuenta como duplicado, así que los
    // autos sin chofer logueable no chocan entre sí.
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_cars_driver_username ON cars(driver_username) WHERE driver_username IS NOT NULL');
  }

  // Comprobante de un pago hecho desde apps/driver (mismo tratamiento que ya
  // tiene movs.comprobante, ver arriba).
  if (!cols('pagos').includes('comprobante')) {
    db.exec('ALTER TABLE pagos ADD COLUMN comprobante TEXT');
    db.exec('ALTER TABLE pagos ADD COLUMN comprobante_nombre TEXT');
    db.exec('ALTER TABLE pagos ADD COLUMN comprobante_tipo TEXT');
  }

  // Antes `amount` significaba dos cosas distintas según el estado: en un cobro
  // pagado era la plata que entró, en uno pendiente la que se esperaba, y en uno
  // parcial la mitad que se pagó. Ahora `amount` es siempre lo facturado y lo
  // efectivamente cobrado vive en `pagos`, un libro con fecha propia (para que
  // un pago de una deuda vieja se impute al mes que corresponde, no a hoy).
  //
  // Esto tiene que correr una única vez en la vida de la base. El guard no
  // puede apoyarse en si `cobrado` existe: esta misma migración la agrega y
  // después la borra, así que en el siguiente arranque volvía a estar
  // ausente y el bloque entero se repetía, duplicando pagos y volviendo a
  // doblar `amount` en cada cuota parcial. La bandera vive en `meta`, que
  // nada más vuelve a tocar.
  const yaMigroCobrado = () => !!db.prepare("SELECT 1 FROM meta WHERE key = 'cobrado_migrado'").get();
  if (!yaMigroCobrado()) {
    // `immediate` toma el lock de escritura antes de leer, y la condición se
    // vuelve a evaluar adentro: si dos procesos arrancan a la vez —pasa con un
    // reinicio que se solapa— el segundo espera y ve la bandera ya puesta.
    db.transaction(() => {
      if (yaMigroCobrado()) return;
      // Una base que ya pasó por la versión rota de esta migración (antes de
      // este fix) puede tener `cobrado` ausente y pagos ya migrados: no hay
      // nada que derivar de nuevo, solo falta dejar la bandera puesta.
      const yaTienePagosMigrados = db.prepare("SELECT 1 FROM pagos WHERE nota = 'Migrado del registro anterior' LIMIT 1").get();
      if (!yaTienePagosMigrados) {
        if (!cols('movs').includes('cobrado')) db.exec('ALTER TABLE movs ADD COLUMN cobrado INTEGER');
        db.exec("UPDATE movs SET cobrado = amount WHERE type = 'ingreso' AND estado = 'pagado'");
        db.exec("UPDATE movs SET cobrado = 0      WHERE type = 'ingreso' AND estado = 'pendiente'");
        // El parcial guardaba solo lo pagado. Todos salieron del generador, que
        // los arma como la mitad de la cuota (`cuota * 3 * 0.5`), así que el
        // doble reconstruye exacto lo facturado. Se usa eso y no la cuota
        // actual del vehículo, que pudo haberse editado después de emitido
        // el cobro.
        db.exec("UPDATE movs SET cobrado = amount, amount = amount * 2 WHERE type = 'ingreso' AND estado = 'parcial'");
        db.exec(`
          INSERT INTO pagos (owner_id, car_id, driver, fecha, monto, tipo, nota)
          SELECT m.owner_id, m.car_id, COALESCE(m.driver, c.driver, 'Sin chofer'),
                 m.date, m.cobrado, 'pago', 'Migrado del registro anterior'
            FROM movs m
            LEFT JOIN cars c ON c.id = m.car_id
           WHERE m.type = 'ingreso' AND COALESCE(m.cobrado, 0) > 0
        `);
      }
      if (cols('movs').includes('cobrado')) db.exec('ALTER TABLE movs DROP COLUMN cobrado');
      db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('cobrado_migrado', '1')").run();
    }).immediate();
  }

  // Migración a la identidad estable de chofer (tabla `drivers`). Crea una fila
  // por cada (owner_id, nombre) distinto que aparezca en la flota, mueve las
  // credenciales que hoy viven en cars, y deja driver_id en cars/movs/pagos/
  // reportes. Es idempotente y corre una sola vez.
  const yaMigroDrivers = () => !!db.prepare("SELECT 1 FROM meta WHERE key = 'drivers_migrado_v1'").get();
  if (!yaMigroDrivers()) {
    db.transaction(() => {
      if (yaMigroDrivers()) return;

      // Columnas en tablas ya existentes. En una base nueva ya vienen en el
      // CREATE del arranque, así que estos ALTER no hacen nada.
      if (!cols('cars').includes('driver_id')) db.exec('ALTER TABLE cars ADD COLUMN driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL');
      if (!cols('movs').includes('driver_id')) db.exec('ALTER TABLE movs ADD COLUMN driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL');
      if (!cols('pagos').includes('driver_id')) db.exec('ALTER TABLE pagos ADD COLUMN driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL');
      if (!cols('reportes_falla').includes('driver_id')) db.exec('ALTER TABLE reportes_falla ADD COLUMN driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL');

      // Una fila de driver por (owner, nombre) que exista en cualquier tabla.
      db.exec(`
        INSERT OR IGNORE INTO drivers (owner_id, nombre, estado, creado)
        SELECT owner_id, driver, 'activo', '1970-01-01'
          FROM cars WHERE driver IS NOT NULL AND driver <> 'Sin chofer'
        UNION
        SELECT owner_id, driver, 'activo', '1970-01-01'
          FROM movs WHERE driver IS NOT NULL AND driver <> 'Sin chofer'
        UNION
        SELECT owner_id, driver, 'activo', '1970-01-01'
          FROM pagos WHERE driver IS NOT NULL AND driver <> 'Sin chofer'
        UNION
        SELECT owner_id, driver, 'activo', '1970-01-01'
          FROM reportes_falla WHERE driver IS NOT NULL AND driver <> 'Sin chofer'
      `);

      // Las credenciales estaban en cars: se mueven a la fila de driver que
      // corresponde (mismo dueño y nombre).
      db.exec(`
        UPDATE drivers SET
          driver_username = COALESCE(driver_username, (
            SELECT c.driver_username FROM cars c
             WHERE c.owner_id = drivers.owner_id AND c.driver = drivers.nombre AND c.driver_username IS NOT NULL
             LIMIT 1
          )),
          driver_pass_hash = COALESCE(driver_pass_hash, (
            SELECT c.driver_pass_hash FROM cars c
             WHERE c.owner_id = drivers.owner_id AND c.driver = drivers.nombre AND c.driver_pass_hash IS NOT NULL
             LIMIT 1
          ))
        WHERE driver_username IS NULL OR driver_pass_hash IS NULL
      `);

      // cars.driver_id: el chofer actual del auto.
      db.exec(`
        UPDATE cars SET driver_id = (
          SELECT d.id FROM drivers d WHERE d.owner_id = cars.owner_id AND d.nombre = cars.driver
        ) WHERE cars.driver <> 'Sin chofer' AND cars.driver_id IS NULL
      `);

      db.exec(`
        UPDATE movs SET driver_id = (
          SELECT d.id FROM drivers d WHERE d.owner_id = movs.owner_id AND d.nombre = movs.driver
        ) WHERE movs.driver IS NOT NULL AND movs.driver_id IS NULL
      `);
      db.exec(`
        UPDATE movs SET driver_id = (
          SELECT driver_id FROM cars c WHERE c.id = movs.car_id
        ) WHERE movs.driver IS NULL AND movs.driver_id IS NULL
      `);

      // pagos/reportes: siempre traen nombre, así que basta cruzar por él.
      db.exec(`
        UPDATE pagos SET driver_id = (
          SELECT d.id FROM drivers d WHERE d.owner_id = pagos.owner_id AND d.nombre = pagos.driver
        ) WHERE pagos.driver_id IS NULL
      `);
      db.exec(`
        UPDATE reportes_falla SET driver_id = (
          SELECT d.id FROM drivers d WHERE d.owner_id = reportes_falla.owner_id AND d.nombre = reportes_falla.driver
        ) WHERE reportes_falla.driver_id IS NULL
      `);

      // chofer_sessions: se re-keyea de car_id a driver_id para que la sesión
      // sobreviva a un cambio de auto. La tabla la crea `migrarAuthChofer`
      // (que corre después de este bloque, en index.ts), ya con la columna
      // driver_id: por eso el re-key solo aplica si la tabla ya existía.
      if (tableExists('chofer_sessions') && !cols('chofer_sessions').includes('driver_id')) {
        db.exec('ALTER TABLE chofer_sessions ADD COLUMN driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE');
        db.exec('CREATE INDEX IF NOT EXISTS idx_chofer_sessions_driver ON chofer_sessions(driver_id)');
        // Re-key de car_id a driver_id: la sesión sigue a la persona, no al auto.
        db.exec(`
          UPDATE chofer_sessions SET driver_id = (
            SELECT c.driver_id FROM cars c WHERE c.id = chofer_sessions.car_id
          ) WHERE chofer_sessions.driver_id IS NULL
        `);
      }

      // Las columnas de credenciales ya no viven en cars. El índice parcial
      // depende de driver_username, así que se suelta antes de la columna: en
      // SQLite 3.35+ (better-sqlite3 v12) borrar la columna primero intenta
      // reconstruir el índice y falla con "no such column".
      db.exec('DROP INDEX IF EXISTS idx_cars_driver_username');
      if (cols('cars').includes('driver_username')) db.exec('ALTER TABLE cars DROP COLUMN driver_username');
      if (cols('cars').includes('driver_pass_hash')) db.exec('ALTER TABLE cars DROP COLUMN driver_pass_hash');

      db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('drivers_migrado_v1', '1')").run();
    }).immediate();
  }

  // La sesión de chofer ahora se keyea por driver_id (sigue a la persona, no al
  // auto), así que la columna `car_id` de `chofer_sessions` quedó de más y con
  // NOT NULL impedía crear sesiones con el nuevo `crearSesionChofer`. Se suelta
  // acá, en una bandera aparte de `drivers_migrado_v1` (que ya corrió en las
  // bases existentes), para no tener que re-ejecutar toda aquella migración.
  const yaDropsCar = () => !!db.prepare("SELECT 1 FROM meta WHERE key = 'chofer_sessions_car_drop_v1'").get();
  if (!yaDropsCar()) {
    db.transaction(() => {
      if (yaDropsCar()) return;
      if (tableExists('chofer_sessions') && cols('chofer_sessions').includes('car_id')) {
        db.exec('DROP INDEX IF EXISTS idx_chofer_sessions_car');
        db.exec('ALTER TABLE chofer_sessions DROP COLUMN car_id');
      }
      db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('chofer_sessions_car_drop_v1', '1')").run();
    }).immediate();
  }
}

/** Crea (si hace falta) y devuelve el id del chofer de un dueño dado su nombre.
 *  Idempotente gracias al índice único (owner_id, nombre). */
export function ensureDriver(db: Database.Database, ownerId: number, nombre: string): number {
  db.prepare("INSERT OR IGNORE INTO drivers (owner_id, nombre, estado, creado) VALUES (?, ?, 'activo', ?)").run(
    ownerId,
    nombre,
    new Date().toISOString(),
  );
  return (db.prepare('SELECT id FROM drivers WHERE owner_id = ? AND nombre = ?').get(ownerId, nombre) as { id: number }).id;
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
    INSERT INTO cars (id, owner_id, plate, model, year, driver_id, driver, cuota, estado, gps_tag, kilometraje, kilometraje_actualizado, service_cada, service_unidad, last_service_date, seguro_date, seguro_nombre, seguro_costo, seguro_periodo, seguro_cada)
    VALUES (@id, @owner_id, @plate, @model, @year, @driver_id, @driver, @cuota, @estado, @gps_tag, @kilometraje, @kilometraje_actualizado, @service_cada, @service_unidad, @last_service_date, @seguro_date, @seguro_nombre, @seguro_costo, @seguro_periodo, @seguro_cada)
  `);
  const insMov = db.prepare(`
    INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado, driver, driver_id)
    VALUES (@owner_id, @car_id, @type, @amount, @date, @descripcion, @cat, @estado, @driver, @driver_id)
  `);
  // Lo que el generador marca como cobrado entra como pago con la fecha de la
  // cuota: es la flota de demostración, donde cada cuota se pagó en el día.
  const insPago = db.prepare(`
    INSERT INTO pagos (owner_id, car_id, driver, driver_id, fecha, monto, tipo)
    VALUES (@owner_id, @car_id, @driver, @driver_id, @fecha, @monto, 'pago')
  `);

  db.transaction(() => {
    const driverDe = new Map<string, number>();
    const driverId = (nombre: string) => {
      let id = driverDe.get(nombre);
      if (id === undefined) {
        id = ensureDriver(db, ownerId, nombre);
        driverDe.set(nombre, id);
      }
      return id;
    };

    for (const c of cars) {
      const did = c.driver === 'Sin chofer' ? null : driverId(c.driver);
      insCar.run({
        id: idDe(c.id),
        owner_id: ownerId,
        plate: c.plate,
        model: c.model,
        year: c.year,
        driver_id: did,
        driver: c.driver,
        cuota: c.cuota,
        estado: c.estado,
        gps_tag: c.gpsTag,
        kilometraje: c.kilometraje,
        kilometraje_actualizado: iso(c.lastServiceDate),
        service_cada: c.serviceCadaMeses,
        service_unidad: 'meses',
        last_service_date: iso(c.lastServiceDate),
        seguro_date: iso(c.seguroDate),
        seguro_nombre: c.seguroNombre,
        seguro_costo: c.seguroCosto,
        seguro_periodo: 'mensual',
        seguro_cada: 12,
      });
    }
    for (const m of movs) {
      const nombre = m.driver ?? 'Sin chofer';
      const did = m.driver ? driverId(nombre) : null;
      const movInfo = insMov.run({
        owner_id: ownerId,
        car_id: idDe(m.carId),
        type: m.type,
        amount: m.amount,
        date: iso(m.date),
        descripcion: m.desc,
        cat: m.cat ?? null,
        estado: m.estado ?? null,
        driver: m.driver ?? null,
        driver_id: did,
      });
      if (m.type === 'egreso') {
        db.prepare('INSERT INTO gasto_items (mov_id, nombre, cantidad, costo_unitario, subtotal) VALUES (?, ?, 1, ?, ?)').run(movInfo.lastInsertRowid, m.desc, m.amount, m.amount);
      }
      if (m.cobrado) {
        insPago.run({
          owner_id: ownerId,
          car_id: idDe(m.carId),
          driver: nombre,
          driver_id: did,
          fecha: iso(m.date),
          monto: m.cobrado,
        });
      }
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
    driverId: r.driver_id ?? null,
    cuota: r.cuota,
    estado: r.estado,
    gpsTag: r.gps_tag,
    serviceCada: r.service_cada,
    serviceUnidad: r.service_unidad,
    lastServiceDate: r.last_service_date || '',
    kilometraje: r.kilometraje,
    kilometrajeActualizado: r.kilometraje_actualizado,
    seguroDate: r.seguro_date || '',
    seguroNombre: r.seguro_nombre,
    seguroCada: r.seguro_cada,
  };
}

export function movToJson(r: MovRow, items: GastoItemRow[] = []) {
  return {
    id: r.id,
    carId: r.car_id,
    type: r.type,
    amount: r.amount,
    date: r.date,
    desc: r.descripcion,
    ...(r.cat ? { cat: r.cat } : {}),
    ...(r.estado ? { estado: r.estado } : {}),
    ...(r.driver ? { driver: r.driver } : {}),
    ...(r.driver_id != null ? { driverId: r.driver_id } : {}),
    ...(r.type === 'egreso' ? { manoObra: r.mano_obra ?? 0, items: items.map((item) => ({ id: item.id, nombre: item.nombre, cantidad: item.cantidad, costoUnitario: item.costo_unitario, subtotal: item.subtotal })) } : {}),
    // El cliente nunca ve la ruta del archivo, solo si hay uno y cómo se llama.
    ...(r.comprobante ? { comprobante: { id: r.comprobante, nombre: r.comprobante_nombre ?? 'comprobante', tipo: r.comprobante_tipo ?? '' } } : {}),
  };
}

export function pagoToJson(r: PagoRow) {
  return {
    id: r.id,
    carId: r.car_id,
    driver: r.driver,
    driverId: r.driver_id ?? null,
    fecha: r.fecha,
    monto: r.monto,
    tipo: r.tipo,
    ...(r.medio ? { medio: r.medio } : {}),
    ...(r.nota ? { nota: r.nota } : {}),
    ...(r.comprobante ? { comprobante: { id: r.comprobante, nombre: r.comprobante_nombre ?? 'comprobante', tipo: r.comprobante_tipo ?? '' } } : {}),
  };
}

export function reporteToJson(r: ReporteRow) {
  return {
    id: r.id,
    carId: r.car_id,
    driver: r.driver,
    driverId: r.driver_id ?? null,
    cat: r.cat,
    urgencia: r.urgencia,
    texto: r.texto,
    estado: r.estado,
    fecha: r.fecha,
  };
}

export function locationToJson(r: LocationRow) {
  return {
    carId: r.car_id,
    latitude: r.latitude,
    longitude: r.longitude,
    ...(r.accuracy == null ? {} : { accuracy: r.accuracy }),
    recordedAt: r.recorded_at,
    receivedAt: r.received_at,
    mocked: Boolean(r.mocked),
  };
}
