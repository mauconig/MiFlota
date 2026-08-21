import { randomBytes, createHash, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type Database from 'better-sqlite3';

const scrypt = promisify(scryptCb) as (pwd: string, salt: Buffer, len: number) => Promise<Buffer>;

const SCRYPT_LEN = 64;
export const COOKIE = 'miflota_sesion';
/** Cuánto dura una sesión sin volver a pedir contraseña. */
const SESION_DIAS = 30;

export function migrarAuth(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY,
      usuario    TEXT NOT NULL UNIQUE COLLATE NOCASE,
      nombre     TEXT NOT NULL,
      pass_hash  TEXT NOT NULL,
      creado     TEXT NOT NULL,
      rol        TEXT NOT NULL DEFAULT 'owner' CHECK (rol IN ('owner','admin')),
      estado     TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','deshabilitado'))
    );

    -- Se guarda el hash del token, no el token: si alguien lee la base no
    -- obtiene sesiones utilizables.
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      creada     TEXT NOT NULL,
      expira     TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);

  const cols = (t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
  if (!cols('users').includes('rol')) db.exec("ALTER TABLE users ADD COLUMN rol TEXT NOT NULL DEFAULT 'owner' CHECK (rol IN ('owner','admin'))");
  if (!cols('users').includes('estado')) db.exec("ALTER TABLE users ADD COLUMN estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','deshabilitado'))");
}

/** `scrypt$N$salt$hash`. Guarda el costo junto al hash para poder subirlo más
 *  adelante sin invalidar las contraseñas ya almacenadas. */
export async function hashPassword(pass: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pass, salt, SCRYPT_LEN);
  return `scrypt$${SCRYPT_LEN}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(pass: string, guardado: string): Promise<boolean> {
  const [alg, lenStr, saltB64, hashB64] = guardado.split('$');
  if (alg !== 'scrypt') return false;
  const salt = Buffer.from(saltB64, 'base64');
  const esperado = Buffer.from(hashB64, 'base64');
  const calculado = await scrypt(pass, salt, Number(lenStr));
  // timingSafeEqual exige longitudes iguales, y compararlas antes filtraría por
  // tiempo igual: se normaliza con un buffer del mismo largo.
  if (calculado.length !== esperado.length) return false;
  return timingSafeEqual(calculado, esperado);
}

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export interface Usuario {
  id: number;
  usuario: string;
  nombre: string;
  rol: string;
  estado: string;
}

export function crearSesion(db: Database.Database, userId: number): { token: string; maxAge: number } {
  const token = randomBytes(32).toString('base64url');
  const expira = new Date(Date.now() + SESION_DIAS * 864e5);
  db.prepare('INSERT INTO sessions (token_hash, user_id, creada, expira) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    new Date().toISOString(),
    expira.toISOString(),
  );
  return { token, maxAge: SESION_DIAS * 86400 };
}

export function usuarioDeSesion(db: Database.Database, token: string | undefined): Usuario | null {
  if (!token) return null;
  const fila = db
    .prepare(
      `SELECT u.id, u.usuario, u.nombre, u.rol, u.estado, s.expira
          FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as (Usuario & { expira: string }) | undefined;
  if (!fila) return null;
  if (new Date(fila.expira) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    return null;
  }
  if (fila.estado !== 'activo') return null;
  return { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol, estado: fila.estado };
}

export function borrarSesion(db: Database.Database, token: string | undefined) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function limpiarSesionesVencidas(db: Database.Database) {
  db.prepare('DELETE FROM sessions WHERE expira < ?').run(new Date().toISOString());
}

/** Crea el usuario inicial desde variables de entorno si todavía no hay ninguno. */
export async function sembrarAdmin(db: Database.Database): Promise<string | null> {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  if (n > 0) return null;

  const usuario = process.env.MIFLOTA_ADMIN_USER;
  const pass = process.env.MIFLOTA_ADMIN_PASSWORD;
  if (!usuario || !pass) throw new Error('No hay usuarios y faltan MIFLOTA_ADMIN_USER / MIFLOTA_ADMIN_PASSWORD para crear el primero');
  if (pass.length < 12) throw new Error('MIFLOTA_ADMIN_PASSWORD debe tener al menos 12 caracteres');

  db.prepare('INSERT INTO users (usuario, nombre, pass_hash, creado, rol, estado) VALUES (?, ?, ?, ?, ?, ?)').run(
    usuario,
    process.env.MIFLOTA_ADMIN_NOMBRE || usuario,
    await hashPassword(pass),
    new Date().toISOString(),
    'owner',
    'activo',
  );
  return usuario;
}

/**
 * Freno a la fuerza bruta: cuenta intentos fallidos por IP y por usuario, y
 * bloquea temporalmente al llegar al límite. En memoria a propósito — un
 * reinicio limpia los contadores, que para este tamaño de instalación alcanza.
 */
const INTENTOS = new Map<string, { fallos: number; hasta: number }>();
const MAX_FALLOS = 8;
const BLOQUEO_MS = 10 * 60_000;

export function bloqueado(clave: string): number {
  const e = INTENTOS.get(clave);
  if (!e || e.hasta < Date.now()) return 0;
  return Math.ceil((e.hasta - Date.now()) / 1000);
}

export function registrarFallo(clave: string) {
  const e = INTENTOS.get(clave) ?? { fallos: 0, hasta: 0 };
  e.fallos += 1;
  if (e.fallos >= MAX_FALLOS) {
    e.hasta = Date.now() + BLOQUEO_MS;
    e.fallos = 0;
  }
  INTENTOS.set(clave, e);
}

export function limpiarFallos(clave: string) {
  INTENTOS.delete(clave);
}
