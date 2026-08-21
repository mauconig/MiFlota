import { randomBytes, createHash, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type Database from 'better-sqlite3';

const scrypt = promisify(scryptCb) as (pwd: string, salt: Buffer, len: number) => Promise<Buffer>;

const SCRYPT_LEN = 64;
export const COOKIE = 'miflota_sesion';
/** Cuánto dura una sesión sin volver a pedir contraseña. */
const SESION_DIAS = 30;
/** Cuánto puede estar un dueño sin abrir la app antes de que la sesión muera
 *  server-side, aunque la cookie siga vigente. Ventana deslizante: cada uso la
 *  renueva. Techo absoluto: SESION_DIAS. */
const INACTIVIDAD_DUENO_MS = 7 * 864e5;
/** Cada cuánto se refresca `ultimo_uso`: escribir en cada request sería
 *  innecesario con better-sqlite3; con esto queda como mucho 1 min de deriva. */
const TOQUE_MS = 60_000;

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

    -- Freno a la fuerza bruta que sobrevive reinicios del proceso: intentos
    -- fallidos y bloqueo vigente, por IP+usuario.
    CREATE TABLE IF NOT EXISTS login_fallos (
      clave           TEXT PRIMARY KEY,
      fallos          INTEGER NOT NULL DEFAULT 0,
      bloqueado_hasta TEXT,
      actualizado     TEXT NOT NULL
    );

    -- Auditoría de auth: quién entró, quién lo intentó y qué sesiones se
    -- revocaron. Solo eventos, no consultas: una fila por acción de auth.
    CREATE TABLE IF NOT EXISTS auth_log (
      id         INTEGER PRIMARY KEY,
      fecha      TEXT NOT NULL,
      evento     TEXT NOT NULL,
      identidad  TEXT,
      ip         TEXT,
      user_agent TEXT,
      detalle    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_auth_log_fecha ON auth_log(fecha);
  `);

  const cols = (t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
  if (!cols('users').includes('rol')) db.exec("ALTER TABLE users ADD COLUMN rol TEXT NOT NULL DEFAULT 'owner' CHECK (rol IN ('owner','admin'))");
  if (!cols('users').includes('estado')) db.exec("ALTER TABLE users ADD COLUMN estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','deshabilitado'))");
  // Último uso de la sesión para la expiración por inactividad. Las filas
  // previas arrancan desde su creación, no desde la migración.
  if (!cols('sessions').includes('ultimo_uso')) {
    db.exec('ALTER TABLE sessions ADD COLUMN ultimo_uso TEXT');
    db.exec('UPDATE sessions SET ultimo_uso = creada WHERE ultimo_uso IS NULL');
  }
  // Origen de la sesión, para que el dueño pueda reconocer sus dispositivos en
  // el panel de sesiones activas.
  if (!cols('sessions').includes('ip')) db.exec('ALTER TABLE sessions ADD COLUMN ip TEXT');
  if (!cols('sessions').includes('user_agent')) db.exec('ALTER TABLE sessions ADD COLUMN user_agent TEXT');
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

/** Origen de un pedido, tal como se guarda en la sesión: para que el dueño
 *  reconozca el dispositivo en el panel de sesiones activas. */
export interface OrigenSesion {
  ip?: string | null;
  userAgent?: string | null;
}

export function crearSesion(db: Database.Database, userId: number, origen?: OrigenSesion): { token: string; maxAge: number } {
  const token = randomBytes(32).toString('base64url');
  const expira = new Date(Date.now() + SESION_DIAS * 864e5);
  db.prepare('INSERT INTO sessions (token_hash, user_id, creada, expira, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    new Date().toISOString(),
    expira.toISOString(),
    origen?.ip ?? null,
    origen?.userAgent ?? null,
  );
  return { token, maxAge: SESION_DIAS * 86400 };
}

export function usuarioDeSesion(db: Database.Database, token: string | undefined): Usuario | null {
  if (!token) return null;
  const fila = db
    .prepare(
      `SELECT u.id, u.usuario, u.nombre, u.rol, u.estado, s.expira, COALESCE(s.ultimo_uso, s.creada) AS ultimo_uso
          FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as (Usuario & { expira: string; ultimo_uso: string }) | undefined;
  if (!fila) return null;
  const hash = hashToken(token);
  if (new Date(fila.expira) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash);
    return null;
  }
  // Expiración por inactividad: la ventana se renueva en cada uso, así que una
  // sesión activa no muere aunque sea vieja; una abandonada sí.
  if (Date.now() - new Date(fila.ultimo_uso).getTime() > INACTIVIDAD_DUENO_MS) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash);
    return null;
  }
  // Toque deslizante con throttle: evita un UPDATE por request.
  if (Date.now() - new Date(fila.ultimo_uso).getTime() > TOQUE_MS) {
    db.prepare('UPDATE sessions SET ultimo_uso = ? WHERE token_hash = ?').run(new Date().toISOString(), hash);
  }
  if (fila.estado !== 'activo') return null;
  return { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol, estado: fila.estado };
}

export function borrarSesion(db: Database.Database, token: string | undefined) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export interface SesionActiva {
  /** rowid de la fila: identificador seguro para revocar (el hash del token no
   *  sale de la base ni hace falta). */
  id: number;
  ip: string | null;
  userAgent: string | null;
  creada: string;
  ultimoUso: string;
  expira: string;
  /** true si es la sesión con la que se hace este pedido. */
  actual: boolean;
}

/** Sesiones vigentes del usuario, más reciente primero. Las vencidas no se
 *  muestran: las barre limpiarSesionesVencidas en el arranque. */
export function sesionesDeUsuario(db: Database.Database, userId: number, tokenActual: string | undefined): SesionActiva[] {
  const ahora = new Date().toISOString();
  const filas = db
    .prepare(
      `SELECT rowid AS id, ip, user_agent AS userAgent, creada,
              COALESCE(ultimo_uso, creada) AS ultimo_uso, expira, token_hash
         FROM sessions WHERE user_id = ? AND expira >= ?
        ORDER BY COALESCE(ultimo_uso, creada) DESC`,
    )
    .all(userId, ahora) as { id: number; ip: string | null; userAgent: string | null; creada: string; ultimo_uso: string; expira: string; token_hash: string }[];
  const hashActual = tokenActual ? hashToken(tokenActual) : null;
  return filas.map((f) => ({
    id: f.id,
    ip: f.ip,
    userAgent: f.userAgent,
    creada: f.creada,
    ultimoUso: f.ultimo_uso,
    expira: f.expira,
    actual: hashActual != null && f.token_hash === hashActual,
  }));
}

/** Revoca una sesión propia por id. false si no existe o no es del usuario. */
export function revocarSesion(db: Database.Database, userId: number, id: number): boolean {
  return db.prepare('DELETE FROM sessions WHERE rowid = ? AND user_id = ?').run(id, userId).changes > 0;
}

/** Cierra todas las sesiones del usuario menos la actual ("salí en todos lados"). */
export function revocarOtrasSesiones(db: Database.Database, userId: number, tokenActual: string | undefined): number {
  if (!tokenActual) return 0;
  return db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(userId, hashToken(tokenActual)).changes;
}

export function limpiarSesionesVencidas(db: Database.Database) {
  const ahora = new Date().toISOString();
  db.prepare('DELETE FROM sessions WHERE expira < ? OR COALESCE(ultimo_uso, creada) < ?').run(ahora, new Date(Date.now() - INACTIVIDAD_DUENO_MS).toISOString());
}

/* --------------------------- rate limit persistente --------------------------- */

/**
 * Freno a la fuerza bruta: cuenta intentos fallidos por IP y por usuario, y
 * bloquea temporalmente al llegar al límite. Vive en la base (no en memoria)
 * para que un reinicio del proceso no limpie los contadores de un atacante.
 */
const MAX_FALLOS = 8;
const BLOQUEO_MS = 10 * 60_000;

export function bloqueado(db: Database.Database, clave: string): number {
  const e = db.prepare('SELECT bloqueado_hasta FROM login_fallos WHERE clave = ?').get(clave) as { bloqueado_hasta: string | null } | undefined;
  if (!e?.bloqueado_hasta) return 0;
  const restante = new Date(e.bloqueado_hasta).getTime() - Date.now();
  return restante > 0 ? Math.ceil(restante / 1000) : 0;
}

export function registrarFallo(db: Database.Database, clave: string) {
  const fila = db.prepare('SELECT fallos FROM login_fallos WHERE clave = ?').get(clave) as { fallos: number } | undefined;
  const fallos = (fila?.fallos ?? 0) + 1;
  if (fallos >= MAX_FALLOS) {
    db.prepare(
      `INSERT INTO login_fallos (clave, fallos, bloqueado_hasta, actualizado) VALUES (?, 0, ?, ?)
       ON CONFLICT(clave) DO UPDATE SET fallos = 0, bloqueado_hasta = excluded.bloqueado_hasta, actualizado = excluded.actualizado`,
    ).run(clave, new Date(Date.now() + BLOQUEO_MS).toISOString(), new Date().toISOString());
  } else {
    db.prepare(
      `INSERT INTO login_fallos (clave, fallos, actualizado) VALUES (?, ?, ?)
       ON CONFLICT(clave) DO UPDATE SET fallos = excluded.fallos, actualizado = excluded.actualizado`,
    ).run(clave, fallos, new Date().toISOString());
  }
}

export function limpiarFallos(db: Database.Database, clave: string) {
  db.prepare('DELETE FROM login_fallos WHERE clave = ?').run(clave);
}

/** Contadores que ya no sirven: sin bloqueo vigente y sin actividad reciente. */
export function limpiarLoginFallos(db: Database.Database) {
  db.prepare('DELETE FROM login_fallos WHERE COALESCE(bloqueado_hasta, \'\') < ? AND actualizado < ?').run(
    new Date().toISOString(),
    new Date(Date.now() - 864e5).toISOString(),
  );
}

/* -------------------------------- auditoría -------------------------------- */

/** Un evento por acción de auth. Nunca guarda tokens ni contraseñas; la
 *  identidad es el nombre de usuario tal cual se lo intentó usar. */
export function registrarAuth(
  db: Database.Database,
  evento: string,
  identidad: string | null,
  ctx?: { ip?: string | null; userAgent?: string | null; detalle?: string | null },
) {
  db.prepare('INSERT INTO auth_log (fecha, evento, identidad, ip, user_agent, detalle) VALUES (?, ?, ?, ?, ?, ?)').run(
    new Date().toISOString(),
    evento,
    identidad,
    ctx?.ip ?? null,
    ctx?.userAgent ?? null,
    ctx?.detalle ?? null,
  );
}

/** Retención: los eventos viejos no tienen valor pasado este plazo. */
export function limpiarAuthLog(db: Database.Database) {
  db.prepare('DELETE FROM auth_log WHERE fecha < ?').run(new Date(Date.now() - 90 * 864e5).toISOString());
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
