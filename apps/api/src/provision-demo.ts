/**
 * Provisiona la base de demo sin borrar datos existentes.
 *
 * Se ejecuta dentro del contenedor con la misma MIFLOTA_DB que usa el API.
 * Es intencionalmente idempotente: la flota solo se siembra cuando el dueño
 * todavía no tiene vehículos y los casos adicionales quedan protegidos por
 * una marca en `meta`.
 */
import { hashPassword, migrarAuth, verifyPassword } from './auth.js';
import { migrarAuthChofer } from './authChofer.js';
import { openDb, sembrarFlota } from './db.js';

const DEMO_VERSION = 'demo_provisionada_v1';
const DEMO_ADMIN = process.env.MIFLOTA_ADMIN_USER ?? 'admin';
const DEMO_ADMIN_PASSWORD = process.env.MIFLOTA_ADMIN_PASSWORD;

type Credential = { plate: string; driver: string; username: string; password: string };

function usernameFor(driver: string): string {
  const normalized = driver
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = normalized[0] ?? 'chofer';
  const last = normalized.length > 1 ? normalized[normalized.length - 1] : '';
  return `${first}${last ? `.${last}` : ''}`.slice(0, 40);
}

/** Contraseñas deliberadamente predecibles: son cuentas de demo documentadas. */
function passwordFor(username: string): string {
  return `M${username.replace('.', '').slice(0, 8)}`;
}

function uniqueUsername(db: ReturnType<typeof openDb>, base: string, carId: string): string {
  let candidate = base;
  let suffix = 2;
  while (db.prepare('SELECT 1 FROM cars WHERE driver_username = ? AND id <> ?').get(candidate, carId)) {
    candidate = `${base.slice(0, 38)}${suffix++}`;
  }
  return candidate;
}

const db = openDb();
migrarAuth(db);
migrarAuthChofer(db);

try {
  const admin = db.prepare('SELECT id, pass_hash FROM users WHERE usuario = ?').get(DEMO_ADMIN) as
    | { id: number; pass_hash: string }
    | undefined;
  if (!admin) throw new Error(`No existe el usuario admin "${DEMO_ADMIN}"; no se crea ni se reemplaza automáticamente.`);
  if (!DEMO_ADMIN_PASSWORD) throw new Error('Falta MIFLOTA_ADMIN_PASSWORD para verificar la cuenta admin existente.');
  if (!(await verifyPassword(DEMO_ADMIN_PASSWORD, admin.pass_hash))) {
    throw new Error('La contraseña configurada no coincide con la cuenta admin existente; no se modifica.');
  }

  const carsBefore = (db.prepare('SELECT count(1) AS n FROM cars WHERE owner_id = ?').get(admin.id) as { n: number }).n;
  const seeded = carsBefore === 0 ? sembrarFlota(db, admin.id) : { cars: 0, movs: 0 };

  const cars = db
    .prepare("SELECT id, plate, driver FROM cars WHERE owner_id = ? AND driver <> 'Sin chofer' ORDER BY id")
    .all(admin.id) as { id: string; plate: string; driver: string }[];
  const credentials: Credential[] = [];
  const updateCredential = db.prepare('UPDATE cars SET driver_username = ?, driver_pass_hash = ? WHERE id = ? AND owner_id = ?');

  for (const car of cars) {
    const username = uniqueUsername(db, usernameFor(car.driver), car.id);
    const password = passwordFor(username);
    updateCredential.run(username, await hashPassword(password), car.id, admin.id);
    credentials.push({ plate: car.plate, driver: car.driver, username, password });
  }

  let mockAdded = false;
  const extra = db.transaction(() => {
    if (db.prepare('SELECT 1 FROM meta WHERE key = ?').get(DEMO_VERSION)) return false;

    const byPlate = (plate: string) => {
      const car = db.prepare('SELECT id, driver FROM cars WHERE owner_id = ? AND plate = ?').get(admin.id, plate) as
        | { id: string; driver: string }
        | undefined;
      if (!car) throw new Error(`No se encontró el vehículo demo ${plate}.`);
      return car;
    };
    const c0 = byPlate('HBTC 412');
    const c1 = byPlate('GKPD 883');
    const c2 = byPlate('HCVR 105');
    const today = '2026-08-14';

    db.prepare(
      `INSERT INTO pagos (owner_id, car_id, driver, fecha, monto, tipo, medio, nota)
       VALUES (?, ?, ?, ?, ?, 'pago', 'Transferencia', 'Demo provisionada v1')`,
    ).run(admin.id, c0.id, c0.driver, today, 190000);

    const report = db.prepare(
      `INSERT INTO reportes_falla (owner_id, car_id, driver, cat, urgencia, texto, estado, fecha)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    report.run(admin.id, c0.id, c0.driver, 'Frenos', 'urgente', 'La luz de freno queda encendida después de apagar.', 'enviada', today);
    report.run(admin.id, c1.id, c1.driver, 'Motor', 'puedo', 'El motor vibra al arrancar en frío.', 'vista', today);
    report.run(admin.id, c2.id, c2.driver, 'Neumáticos', 'urgente', 'La rueda trasera pierde aire durante el turno.', 'en_taller', today);

    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run(DEMO_VERSION, new Date().toISOString());
    return true;
  })();
  mockAdded = extra;

  const result = { admin: DEMO_ADMIN, seeded, credentials, mockAdded };
  if (process.argv.includes('--json')) console.log(JSON.stringify(result));
  else {
    console.log(`Cuenta admin verificada: ${DEMO_ADMIN}`);
    console.log(`Flota sembrada: ${seeded.cars} vehículos, ${seeded.movs} movimientos.`);
    console.log(`Credenciales de chofer preparadas: ${credentials.length}.`);
    console.log(`Casos demo adicionales: ${mockAdded ? 'agregados' : 'ya existentes'}.`);
    console.log(JSON.stringify(credentials, null, 2));
  }
} finally {
  db.close();
}
