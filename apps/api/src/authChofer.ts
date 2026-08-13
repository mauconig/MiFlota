import { randomBytes, randomInt, createHash } from 'node:crypto';
import type Database from 'better-sqlite3';

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

/** Cuánto dura una sesión de chofer sin volver a pedir contraseña. Igual que
 *  la del dueño por ahora: no hay motivo todavía para que dure distinto. */
const SESION_DIAS = 30;

export function migrarAuthChofer(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chofer_sessions (
      token_hash TEXT PRIMARY KEY,
      car_id     TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
      creada     TEXT NOT NULL,
      expira     TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chofer_sessions_car ON chofer_sessions(car_id);
  `);
}

export function crearSesionChofer(db: Database.Database, carId: string): { token: string; maxAge: number } {
  const token = randomBytes(32).toString('base64url');
  const expira = new Date(Date.now() + SESION_DIAS * 864e5);
  db.prepare('INSERT INTO chofer_sessions (token_hash, car_id, creada, expira) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    carId,
    new Date().toISOString(),
    expira.toISOString(),
  );
  return { token, maxAge: SESION_DIAS * 86400 };
}

export interface SesionChofer {
  carId: string;
  driver: string;
  ownerId: number;
}

/** A diferencia de `usuarioDeSesion`, resuelve `driver`/`ownerId` en vivo
 *  contra `cars` en cada pedido, no desde una copia guardada al loguearse:
 *  así, si el dueño reasigna el auto (lo que además borra esta sesión, ver
 *  `borrarSesionesDeCar`), no queda una sesión vieja resolviendo a datos de
 *  otro chofer. */
export function quienChofer(db: Database.Database, req: { headers: { authorization?: string } }): SesionChofer | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length).trim();
  if (!token) return null;

  const fila = db
    .prepare(
      `SELECT c.id AS car_id, c.driver, c.owner_id, s.expira
         FROM chofer_sessions s JOIN cars c ON c.id = s.car_id
        WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as { car_id: string; driver: string; owner_id: number; expira: string } | undefined;
  if (!fila) return null;
  if (new Date(fila.expira) < new Date()) {
    db.prepare('DELETE FROM chofer_sessions WHERE token_hash = ?').run(hashToken(token));
    return null;
  }
  return { carId: fila.car_id, driver: fila.driver, ownerId: fila.owner_id };
}

export function borrarSesionChofer(db: Database.Database, token: string | undefined) {
  if (token) db.prepare('DELETE FROM chofer_sessions WHERE token_hash = ?').run(hashToken(token));
}

/** Se llama al reasignar el chofer de un auto y al regenerar credenciales:
 *  en ambos casos, cualquier sesión que quedara abierta tiene que dejar de
 *  servir de inmediato. */
export function borrarSesionesDeCar(db: Database.Database, carId: string) {
  db.prepare('DELETE FROM chofer_sessions WHERE car_id = ?').run(carId);
}

export function limpiarSesionesChoferVencidas(db: Database.Database) {
  db.prepare('DELETE FROM chofer_sessions WHERE expira < ?').run(new Date().toISOString());
}

function usernameBase(driverName: string): string {
  const norm = driverName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
  const parts = norm
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
  if (!parts.length) return 'chofer';
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  return (first + (last ? '.' + last : '')).slice(0, 30) || 'chofer';
}

/** Único en toda la base, no por dueño: el chofer se loguea con el usuario
 *  solo, sin decir a qué flota pertenece, así que dos "carlos.paredes" de
 *  dueños distintos no podrían distinguirse al entrar. */
export function generarUsername(db: Database.Database, driverName: string): string {
  const base = usernameBase(driverName);
  const existe = db.prepare('SELECT 1 FROM cars WHERE driver_username = ?');
  let candidato = base;
  let n = 2;
  while (existe.get(candidato)) candidato = base + n++;
  return candidato;
}

// Sin 0/O, 1/l/I, 5/S, 8/B: son los pares que más se confunden al dictar o
// leer una contraseña en voz alta.
const ALFABETO_PASS = 'abcdefghijkmnopqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZ2346789';

export function generarPassword(largo = 9): string {
  let out = '';
  for (let i = 0; i < largo; i++) out += ALFABETO_PASS[randomInt(ALFABETO_PASS.length)];
  return out;
}
