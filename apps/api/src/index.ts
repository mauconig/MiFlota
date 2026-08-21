import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { createReadStream, existsSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { CarRow, LocationRow, MovRow, PagoRow, ReporteRow } from './db.js';
import { COMPROBANTES_DIR, DB_PATH, carToJson, ensureDriver, locationToJson, movToJson, openDb, pagoToJson, reporteToJson } from './db.js';
import {
  COOKIE,
  bloqueado,
  borrarSesion,
  crearSesion,
  limpiarAuthLog,
  limpiarFallos,
  limpiarLoginFallos,
  limpiarSesionesVencidas,
  migrarAuth,
  registrarAuth,
  registrarFallo,
  sembrarAdmin,
  usuarioDeSesion,
  verifyPassword,
  hashPassword,
} from './auth.js';
import {
  borrarSesionChofer,
  borrarSesionesDeDriver,
  crearSesionChofer,
  generarPassword,
  generarUsername,
  limpiarSesionesChoferVencidas,
  migrarAuthChofer,
  quienChofer,
} from './authChofer.js';
import { imputar } from './cobranza.js';
import { answerAssistant, buildAssistantSnapshot, unavailableAssistantReply, type AssistantHistoryItem } from './assistant.js';
import { sendOwnerPush } from './push.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = process.env.MIFLOTA_PUBLIC ?? join(HERE, '..', 'public');
const PORT = Number(process.env.PORT ?? 3000);

/** Qué día es hoy para el servidor. La flota de demostración está fijada a una
 *  fecha (ver `TODAY` en el cliente), y sin poder alinear las dos el servidor
 *  rechazaría por "futuro" todo lo que se cargue desde esa app. En producción
 *  no se define y manda el reloj real. */
const hoyISO = () => process.env.MIFLOTA_HOY ?? new Date().toISOString().slice(0, 10);

const db = openDb();
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

migrarAuth(db);
migrarAuthChofer(db);
limpiarSesionesVencidas(db);
limpiarSesionesChoferVencidas(db);
limpiarLoginFallos(db);
limpiarAuthLog(db);
const adminCreado = await sembrarAdmin(db);
if (adminCreado) app.log.info({ usuario: adminCreado }, 'usuario inicial creado');

await app.register(fastifyCookie);
// El límite del archivo lo aplica el plugin mientras lo lee, así que un envío
// gigante se corta en el camino en vez de terminar entero en memoria.
await app.register(fastifyMultipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 8 } });

// Un cuerpo vacío anunciado como JSON no es un error: fetch manda el
// Content-Type aunque el pedido no lleve datos (DELETE, logout). Con el parser
// por defecto, Fastify contesta 400 antes de que la ruta llegue a ejecutarse.
app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  const texto = typeof body === 'string' ? body : body.toString('utf8');
  if (texto.trim() === '') return done(null, undefined);
  try {
    done(null, JSON.parse(texto));
  } catch {
    done(Object.assign(new Error('JSON inválido'), { statusCode: 400 }), undefined);
  }
});

/* ------------------------------ sesión ------------------------------ */

/** Rutas que se pueden pedir sin sesión. Todo lo demás bajo /api la exige. */
const ABIERTAS = new Set(['/api/health', '/api/login', '/api/me']);

app.addHook('preHandler', async (req, reply) => {
  if (!req.url.startsWith('/api/')) return;
  // El chofer no tiene sesión de dueño: estas rutas validan su propio Bearer
  // token adentro, con quienChofer(), en vez de la cookie de acá.
  if (req.url.startsWith('/api/chofer/')) return;
  if (ABIERTAS.has(req.url.split('?')[0])) return;
  if (!usuarioDeSesion(db, req.cookies[COOKIE])) return reply.code(401).send({ error: 'Sesión requerida' });
});

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // Detrás de Caddy el navegador siempre habla HTTPS; en desarrollo plano una
  // cookie Secure nunca llegaría, así que se ata al entorno.
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/** Contexto de auditoría para eventos de auth: de dónde vino el intento. */
const ctxAuth = (req: { ip: string; headers: { 'user-agent'?: string | string[] } }) => ({
  ip: req.ip,
  userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'] ?? null,
});

app.post<{ Body: { usuario?: string; password?: string } }>('/api/login', async (req, reply) => {
  const usuario = String(req.body?.usuario ?? '').trim();
  const password = String(req.body?.password ?? '');
  const clave = `${req.ip}|${usuario.toLowerCase()}`;

  const espera = bloqueado(db, clave);
  if (espera) {
    registrarAuth(db, 'login_bloqueado', usuario || null, { ...ctxAuth(req), detalle: `${espera}s restantes` });
    return reply.code(429).send({ error: `Demasiados intentos. Probá de nuevo en ${Math.ceil(espera / 60)} minutos.` });
  }
  if (!usuario || !password) return reply.code(400).send({ error: 'Completá usuario y contraseña' });

  const fila = db.prepare('SELECT id, usuario, nombre, pass_hash, estado FROM users WHERE usuario = ?').get(usuario) as
    | { id: number; usuario: string; nombre: string; pass_hash: string; estado: string }
    | undefined;

  // Mismo mensaje exista o no el usuario, o esté deshabilitado: distinguirlos
  // permitiría enumerar cuentas o saber cuáles están activas.
  const ok = fila && fila.estado === 'activo' ? await verifyPassword(password, fila.pass_hash) : false;
  if (!ok) {
    registrarFallo(db, clave);
    registrarAuth(db, 'login_fallo', usuario || null, ctxAuth(req));
    return reply.code(401).send({ error: 'Usuario o contraseña incorrectos' });
  }

  limpiarFallos(db, clave);
  const { token, maxAge } = crearSesion(db, fila!.id);
  registrarAuth(db, 'login_ok', fila!.usuario, ctxAuth(req));
  reply.setCookie(COOKIE, token, { ...cookieOpts, maxAge });
  return { usuario: fila!.usuario, nombre: fila!.nombre };
});

app.post('/api/logout', async (req, reply) => {
  const u = usuarioDeSesion(db, req.cookies[COOKIE]);
  borrarSesion(db, req.cookies[COOKIE]);
  if (u) registrarAuth(db, 'logout', u.usuario, ctxAuth(req));
  reply.clearCookie(COOKIE, cookieOpts);
  return { ok: true };
});

app.get('/api/me', async (req) => {
  const u = usuarioDeSesion(db, req.cookies[COOKIE]);
  return u
    ? { autenticado: true, usuario: u.usuario, nombre: u.nombre, rol: u.rol, estado: u.estado }
    : { autenticado: false };
});

/* ------------------------------- API ------------------------------- */

// Toda lectura y escritura de flota lleva el owner en el WHERE: es lo único que
// impide que un usuario toque los vehículos de otro.
const selCars = db.prepare('SELECT * FROM cars WHERE owner_id = ? ORDER BY rowid');
const selMovs = db.prepare('SELECT * FROM movs WHERE owner_id = ? ORDER BY date DESC, id DESC');
const selPagos = db.prepare('SELECT * FROM pagos WHERE owner_id = ? ORDER BY fecha DESC, id DESC');
const selCar = db.prepare('SELECT * FROM cars WHERE id = ? AND owner_id = ?');
const selLocations = db.prepare(`
  SELECT l.*
    FROM driver_locations l
    JOIN cars c ON c.id = l.car_id
   WHERE c.owner_id = ?
   ORDER BY l.received_at DESC
`);

/** El preHandler ya rechazó las peticiones sin sesión, así que acá siempre hay usuario. */
const quien = (req: { cookies: Record<string, string | undefined> }) => usuarioDeSesion(db, req.cookies[COOKIE])!;

app.get('/api/health', async () => ({ ok: true, db: DB_PATH }));

/** Un solo GET con todo: la vista deriva absolutamente todo de estas listas,
 *  así que partirlo en endpoints por pantalla solo agregaría viajes de red. */
app.get('/api/state', async (req) => {
  const u = quien(req);
  return {
    cars: (selCars.all(u.id) as CarRow[]).map(carToJson),
    movs: (selMovs.all(u.id) as MovRow[]).map(movToJson),
    pagos: (selPagos.all(u.id) as PagoRow[]).map(pagoToJson),
  };
});

interface AdminPushTokenBody {
  token?: string;
  platform?: string;
}

const PUSH_TOKEN_RE = /^(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/;
const PUSH_PLATFORMS = new Set(['android', 'ios', 'web']);

/** Registra el dispositivo del dueño para recibir novedades de su flota. */
app.post<{ Body: AdminPushTokenBody }>('/api/push/admin/register', async (req, reply) => {
  const u = quien(req);
  const token = String(req.body?.token ?? '').trim();
  const platform = String(req.body?.platform ?? '').trim().toLowerCase();
  if (!PUSH_TOKEN_RE.test(token) || token.length > 256) return reply.code(400).send({ error: 'Token push inválido' });
  if (!PUSH_PLATFORMS.has(platform)) return reply.code(400).send({ error: 'Plataforma inválida' });

  const ahora = new Date().toISOString();
  db.prepare(`
    INSERT INTO admin_push_tokens (owner_id, token, platform, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(token) DO UPDATE SET owner_id = excluded.owner_id, platform = excluded.platform, updated_at = excluded.updated_at
  `).run(u.id, token, platform, ahora, ahora);
  return { ok: true };
});

/** Quita el token antes de cerrar sesión para no enviar datos al usuario equivocado. */
app.delete<{ Body: AdminPushTokenBody }>('/api/push/admin/register', async (req) => {
  const u = quien(req);
  const token = String(req.body?.token ?? '').trim();
  if (token) db.prepare('DELETE FROM admin_push_tokens WHERE owner_id = ? AND token = ?').run(u.id, token);
  return { ok: true };
});

interface AssistantQueryBody {
  question?: string;
  history?: AssistantHistoryItem[];
}

// Evita que dobles taps o clientes reintentando en paralelo consuman dos
// respuestas del modelo para el mismo dueño. También serializa las respuestas
// locales, cuya sección crítica dura apenas unos milisegundos.
const assistantInFlight = new Set<number>();
const assistantRate = new Map<number, { since: number; count: number }>();
const ASSISTANT_RATE_WINDOW_MS = 60_000;
const ASSISTANT_RATE_MAX = 20;

function allowAssistantRequest(ownerId: number): boolean {
  const now = Date.now();
  const current = assistantRate.get(ownerId);
  if (!current || now - current.since >= ASSISTANT_RATE_WINDOW_MS) {
    assistantRate.set(ownerId, { since: now, count: 1 });
    return true;
  }
  if (current.count >= ASSISTANT_RATE_MAX) return false;
  current.count += 1;
  return true;
}

app.post<{ Body: AssistantQueryBody }>('/api/assistant/query', async (req, reply) => {
  const u = quien(req);
  const question = String(req.body?.question ?? '').trim();
  if (!question) return reply.code(400).send({ error: 'Escribí una pregunta' });
  if (question.length > 600) return reply.code(400).send({ error: 'La pregunta no puede superar 600 caracteres' });
  if (!allowAssistantRequest(u.id)) return reply.code(429).send({ error: 'Demasiadas preguntas seguidas. Esperá un minuto.' });
  if (assistantInFlight.has(u.id)) return reply.code(429).send({ error: 'Ya estoy respondiendo otra pregunta' });

  const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
  const history: AssistantHistoryItem[] = rawHistory
    .filter((item): item is AssistantHistoryItem => !!item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .slice(-6)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 1200) }));

  const snapshot = buildAssistantSnapshot(selCars.all(u.id) as CarRow[], selMovs.all(u.id) as MovRow[], selPagos.all(u.id) as PagoRow[], hoyISO());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  assistantInFlight.add(u.id);
  try {
    return await answerAssistant(question, history, snapshot, {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL,
      model: process.env.DEEPSEEK_MODEL,
      signal: controller.signal,
    });
  } catch (error) {
    req.log.warn({ error }, 'falló la consulta a DeepSeek');
    return unavailableAssistantReply(snapshot);
  } finally {
    clearTimeout(timeout);
    assistantInFlight.delete(u.id);
  }
});

/** Ultimas posiciones conocidas, separadas del estado historico para que el
 * panel pueda refrescar el mapa sin descargar todos los movimientos. */
app.get('/api/locations', async (req) => {
  const u = quien(req);
  return (selLocations.all(u.id) as LocationRow[]).map(locationToJson);
});

const ESTADOS = new Set(['activo', 'taller', 'baja']);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
/** Tope de meses entre renovaciones de la póliza. Igual al del cliente. */
const SEG_CADA_MAX = 120;

interface CarPatch {
  driver?: string;
  cuota?: number;
  estado?: string;
  gpsTag?: string;
  serviceCada?: number;
  serviceUnidad?: string;
  lastServiceDate?: string;
  seguroDate?: string;
  seguroCosto?: number;
  seguroPeriodo?: string;
  seguroCada?: number;
}

/** Mapea los campos que el cliente puede tocar a su columna, validando cada uno.
 *  `driver` y `cuota` se manejan aparte (la asignación de chofer ahora enlaza
 *  una fila de `drivers`, no solo un texto). */
const CAMPOS: Record<string, { col: string; ok: (v: unknown) => boolean }> = {
  estado: { col: 'estado', ok: (v) => typeof v === 'string' && ESTADOS.has(v) },
  gpsTag: { col: 'gps_tag', ok: (v) => typeof v === 'string' && v.length <= 40 },
  serviceCada: { col: 'service_cada', ok: (v) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 3650 },
  serviceUnidad: { col: 'service_unidad', ok: (v) => v === 'dias' || v === 'meses' },
  lastServiceDate: { col: 'last_service_date', ok: (v) => typeof v === 'string' && FECHA.test(v) },
  seguroDate: { col: 'seguro_date', ok: (v) => typeof v === 'string' && FECHA.test(v) },
  seguroCosto: { col: 'seguro_costo', ok: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 1_000_000_000 },
  seguroPeriodo: { col: 'seguro_periodo', ok: (v) => v === 'mensual' || v === 'anual' },
  seguroCada: { col: 'seguro_cada', ok: (v) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= SEG_CADA_MAX },
};

/**
 * Asigna (o desasigna) el chofer de un auto y deja `cuota` en coherencia.
 * La identidad del chofer vive en `drivers`: reasignar el auto no borra al
 * chofer ni sus credenciales, solo mueve el vínculo. Se cumple "un auto por
 * chofer": si el chofer ya estaba en otro auto activo, ese otro queda libre.
 * Mata las sesiones de los choferes que terminan sin auto activo.
 * Devuelve false si el auto no existe para ese dueño.
 */
function aplicarDriverEnAuto(db: ReturnType<typeof openDb>, ownerId: number, carId: string, nombre: string | null, cuota: number): boolean {
  const car = db.prepare('SELECT driver_id FROM cars WHERE id = ? AND owner_id = ?').get(carId, ownerId) as { driver_id: number | null } | undefined;
  if (!car) return false;

  const liberados = new Set<number>();
  const targetId = nombre && nombre !== 'Sin chofer' ? ensureDriver(db, ownerId, nombre) : null;

  const oldOccupant = car.driver_id;
  if (oldOccupant != null && oldOccupant !== targetId) liberados.add(oldOccupant);

  if (targetId == null) {
    db.prepare("UPDATE cars SET driver_id = NULL, driver = 'Sin chofer', cuota = 0 WHERE id = ? AND owner_id = ?").run(carId, ownerId);
  } else {
    // Un solo auto activo por chofer: sacarlo de cualquier otro auto activo.
    db.prepare("UPDATE cars SET driver_id = NULL, driver = 'Sin chofer', cuota = 0 WHERE owner_id = ? AND driver_id = ? AND id <> ? AND estado <> 'baja'").run(
      ownerId,
      targetId,
      carId,
    );
    db.prepare('UPDATE cars SET driver_id = ?, driver = ?, cuota = ? WHERE id = ? AND owner_id = ?').run(targetId, nombre, cuota, carId, ownerId);
  }

  for (const did of liberados) {
    if (!db.prepare("SELECT 1 FROM cars WHERE driver_id = ? AND estado <> 'baja' LIMIT 1").get(did)) borrarSesionesDeDriver(db, did);
  }
  return true;
}

app.patch<{ Params: { id: string }; Body: CarPatch }>('/api/cars/:id', async (req, reply) => {
  const u = quien(req);
  // Un vehículo de otro dueño responde igual que uno inexistente: distinguirlos
  // permitiría sondear qué ids existen en otras cuentas.
  const actual = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!actual) return reply.code(404).send({ error: 'Vehículo inexistente' });

  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [campo, def] of Object.entries(CAMPOS) as [string, { col: string; ok: (v: unknown) => boolean }][]) {
    const v = req.body?.[campo as keyof CarPatch];
    if (v === undefined) continue;
    if (!def.ok(v)) return reply.code(400).send({ error: `Valor inválido para ${campo}` });
    sets.push(`${def.col} = ?`);
    vals.push(v);
  }

  // Sin chofer no hay cuota. Se resuelve acá y no solo en el cliente para que
  // la regla valga también para cualquier otra vía de escritura.
  const driverFinal = req.body?.driver ?? actual.driver;
  const cuotaFinal = req.body?.cuota ?? actual.cuota;
  if (driverFinal === 'Sin chofer' && cuotaFinal > 0) {
    if (req.body?.cuota !== undefined && req.body?.driver === undefined) {
      return reply.code(400).send({ error: 'No se puede fijar una cuota en un vehículo sin chofer' });
    }
    sets.push('cuota = ?');
    vals.push(0);
  }

  db.prepare(`UPDATE cars SET ${sets.join(', ')} WHERE id = ? AND owner_id = ?`).run(...vals, req.params.id, u.id);

  // El chofer (y su cuota) se manejan enlazando la fila de drivers.
  if (req.body?.driver !== undefined) {
    aplicarDriverEnAuto(db, u.id, req.params.id, req.body.driver === 'Sin chofer' ? null : req.body.driver, req.body?.cuota ?? 0);
  } else if (req.body?.cuota !== undefined) {
    db.prepare('UPDATE cars SET cuota = ? WHERE id = ? AND owner_id = ?').run(req.body.cuota, req.params.id, u.id);
  }

  return carToJson(selCar.get(req.params.id, u.id) as CarRow);
});

/** Prepara las credenciales que se muestran en el paso de confirmación. No
 * toca el vehículo: si el dueño cierra el modal, el alta queda cancelada sin
 * dejar un usuario huérfano ni una contraseña activa. */
app.post<{ Params: { id: string }; Body: { driver?: string } }>('/api/cars/:id/chofer-credenciales/preview', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });

  const driver = String(req.body?.driver ?? '').trim();
  if (driver === 'Sin chofer' || !driver || driver.length > 80) {
    return reply.code(400).send({ error: 'Nombre de chofer inválido' });
  }

  const driverId = ensureDriver(db, u.id, driver);
  const existente = db.prepare('SELECT driver_username FROM drivers WHERE id = ?').get(driverId) as { driver_username: string | null } | undefined;
  return {
    username: existente?.driver_username ?? generarUsername(db, driver),
    password: generarPassword(),
  };
});

interface AsignarChoferBody {
  driver?: string;
  cuota?: number;
  username?: string;
  password?: string;
}

/** Confirma en una sola escritura tanto la asignación como las credenciales
 * que el dueño acaba de revisar. Así nunca queda un chofer asignado sin poder
 * entrar a la app, ni credenciales activas para un alta cancelada. */
app.post<{ Params: { id: string }; Body: AsignarChoferBody }>('/api/cars/:id/asignar-chofer', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });

  const driver = String(req.body?.driver ?? '').trim();
  const cuota = req.body?.cuota;
  const username = String(req.body?.username ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (driver === 'Sin chofer' || !driver || driver.length > 80) return reply.code(400).send({ error: 'Nombre de chofer inválido' });
  if (typeof cuota !== 'number' || !Number.isInteger(cuota) || cuota <= 0 || cuota > 100_000_000) return reply.code(400).send({ error: 'Cuota diaria inválida' });
  if (!/^[a-z0-9.]{1,40}$/.test(username)) return reply.code(400).send({ error: 'Usuario de chofer inválido' });
  if (!/^[A-Za-z2-9]{9}$/.test(password)) return reply.code(400).send({ error: 'Contraseña de chofer inválida' });

  const passHash = await hashPassword(password);
  // Se comprueba después del hash: ese es el único await de la ruta y otra
  // asignación podría haber ocupado el usuario mientras se calculaba.
  const usado = db.prepare('SELECT 1 FROM drivers WHERE driver_username = ? AND NOT (owner_id = ? AND nombre = ?)').get(username, u.id, driver);
  if (usado) return reply.code(409).send({ error: 'Ese usuario acaba de ser ocupado. Volvé atrás y generá datos nuevos.' });

  aplicarDriverEnAuto(db, u.id, car.id, driver, cuota);
  const driverId = ensureDriver(db, u.id, driver);
  db.prepare('UPDATE drivers SET driver_username = ?, driver_pass_hash = ? WHERE id = ?').run(username, passHash, driverId);
  borrarSesionesDeDriver(db, driverId);
  req.log.info({ car: car.plate, driver }, 'chofer asignado con credenciales');
  return { car: carToJson(selCar.get(car.id, u.id) as CarRow) };
});

/** Genera (o regenera) el usuario y contraseña con los que el chofer entra a
 * apps/driver. El usuario se mantiene si ya existía —cambiarlo en cada
 * reseteo rompería el hábito del chofer sin necesidad—, la contraseña
 * siempre es nueva y cualquier sesión abierta con la anterior se cierra. */
app.post<{ Params: { id: string } }>('/api/cars/:id/chofer-credenciales', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });
  if (!car.driver_id) return reply.code(400).send({ error: 'Asigná un chofer antes de generar credenciales' });

  const driver = db.prepare('SELECT id, nombre, driver_username FROM drivers WHERE id = ?').get(car.driver_id) as
    | { id: number; nombre: string; driver_username: string | null }
    | undefined;
  if (!driver) return reply.code(404).send({ error: 'Chofer inexistente' });

  const username = driver.driver_username ?? generarUsername(db, driver.nombre);
  const password = generarPassword();
  db.prepare('UPDATE drivers SET driver_username = ?, driver_pass_hash = ? WHERE id = ?').run(username, await hashPassword(password), driver.id);
  borrarSesionesDeDriver(db, driver.id);
  req.log.info({ car: car.plate, driver: driver.nombre }, 'credenciales de chofer regeneradas');
  return { username, password };
});

/** Borra el vehículo y, por la FK en cascada, todos sus movimientos. Es
 *  destructivo a propósito: `estado = 'baja'` es la alternativa que conserva
 *  el historial, y la interfaz ofrece las dos. */
app.delete<{ Params: { id: string } }>('/api/cars/:id', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });

  const { n } = db.prepare('SELECT COUNT(*) AS n FROM movs WHERE car_id = ? AND owner_id = ?').get(req.params.id, u.id) as { n: number };

  // Los movimientos se van en cascada, pero los archivos no: sin esto, cada
  // vehículo borrado dejaría sus comprobantes ocupando el disco para siempre.
  // pagos.car_id es SET NULL (no CASCADE) al borrar el auto, así que sus
  // comprobantes hay que juntarlos acá también, antes de que se pierda el
  // vínculo con el vehículo.
  const adjuntos = [
    ...(db.prepare('SELECT comprobante FROM movs WHERE car_id = ? AND owner_id = ? AND comprobante IS NOT NULL').all(req.params.id, u.id) as { comprobante: string }[]),
    ...(db.prepare('SELECT comprobante FROM pagos WHERE car_id = ? AND owner_id = ? AND comprobante IS NOT NULL').all(req.params.id, u.id) as { comprobante: string }[]),
  ];

  db.prepare('DELETE FROM cars WHERE id = ? AND owner_id = ?').run(req.params.id, u.id);
  // El chofer sobrevive (su fila en drivers no se borra), pero si este era su
  // único auto activo, su sesión ya no tiene con qué abrir la app.
  if (car.driver_id != null && !db.prepare("SELECT 1 FROM cars WHERE driver_id = ? AND estado <> 'baja' LIMIT 1").get(car.driver_id)) {
    borrarSesionesDeDriver(db, car.driver_id);
  }

  for (const a of adjuntos) {
    // Que falle un borrado de archivo no puede tumbar la respuesta: la fila ya
    // no está, y un huérfano es preferible a un error después del hecho.
    await rm(join(COMPROBANTES_DIR, a.comprobante), { force: true }).catch((e) => req.log.warn({ e, id: a.comprobante }, 'no se pudo borrar el comprobante'));
  }
  req.log.info({ car: car.plate, movs: n }, 'vehículo eliminado');
  return { ok: true, plate: car.plate, movs: n };
});

interface NuevoCar {
  plate: string;
  model: string;
  year: number;
  gpsTag?: string;
  lastServiceDate?: string;
  serviceCada?: number;
  serviceUnidad?: string;
  seguroDate?: string;
  seguroCosto?: number;
  seguroPeriodo?: string;
  seguroCada?: number;
}

app.post<{ Body: NuevoCar }>('/api/cars', async (req, reply) => {
  const u = quien(req);
  const b = req.body ?? ({} as NuevoCar);
  const plate = String(b.plate ?? '').trim().toUpperCase();
  const model = String(b.model ?? '').trim();
  if (!plate) return reply.code(400).send({ error: 'La chapa es obligatoria' });
  if (!model) return reply.code(400).send({ error: 'La marca y modelo son obligatorios' });

  // La chapa es única dentro de la flota de cada uno, no de toda la base.
  const dup = db.prepare('SELECT id FROM cars WHERE UPPER(plate) = ? AND owner_id = ?').get(plate, u.id);
  if (dup) return reply.code(409).send({ error: 'Ya existe un vehículo con esa chapa' });

  const hoy = new Date().toISOString().slice(0, 10);
  const enMeses = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  };
  // El vencimiento del seguro lo trae el alta. Si faltara, un año desde hoy es
  // el único supuesto razonable, pero se acepta para no romper clientes viejos.
  if (b.seguroDate !== undefined && !(typeof b.seguroDate === 'string' && FECHA.test(b.seguroDate))) {
    return reply.code(400).send({ error: 'Fecha de vencimiento del seguro inválida' });
  }
  const car = {
    id: 'c' + Date.now().toString(36),
    owner_id: u.id,
    plate,
    model,
    year: Number.isInteger(b.year) && b.year > 1950 && b.year < 2100 ? b.year : 2018,
    // Un vehículo nace sin chofer y, por lo tanto, sin cuota: la cuota es lo
    // que paga el chofer, así que se define recién al asignarle uno.
    driver: 'Sin chofer',
    cuota: 0,
    estado: 'activo',
    gps_tag: String(b.gpsTag ?? '').trim().slice(0, 40),
    service_cada: Number.isInteger(b.serviceCada) && b.serviceCada! >= 1 && b.serviceCada! <= 3650 ? b.serviceCada! : 6,
    service_unidad: b.serviceUnidad === 'dias' ? 'dias' : 'meses',
    last_service_date: typeof b.lastServiceDate === 'string' && FECHA.test(b.lastServiceDate) && b.lastServiceDate <= hoy ? b.lastServiceDate : hoy,
    seguro_date: b.seguroDate ?? enMeses(12),
    seguro_costo: Number.isInteger(b.seguroCosto) && b.seguroCosto! >= 0 && b.seguroCosto! <= 1_000_000_000 ? b.seguroCosto! : 0,
    seguro_periodo: b.seguroPeriodo === 'anual' ? 'anual' : 'mensual',
    seguro_cada: Number.isInteger(b.seguroCada) && b.seguroCada! >= 1 && b.seguroCada! <= SEG_CADA_MAX ? b.seguroCada! : 12,
  };
  db.prepare(`
    INSERT INTO cars (id, owner_id, plate, model, year, driver, cuota, estado, gps_tag, service_cada, service_unidad, last_service_date, seguro_date, seguro_costo, seguro_periodo, seguro_cada)
    VALUES (@id, @owner_id, @plate, @model, @year, @driver, @cuota, @estado, @gps_tag, @service_cada, @service_unidad, @last_service_date, @seguro_date, @seguro_costo, @seguro_periodo, @seguro_cada)
  `).run(car);

  return reply.code(201).send(carToJson(selCar.get(car.id, u.id) as CarRow));
});

/* ---------------------------- taller ---------------------------- */

/** Tipos aceptados como comprobante. La clave es que ninguno se ejecuta en el
 *  navegador: nada de SVG ni HTML, que servidos desde el mismo origen serían
 *  un XSS con sesión válida. El Content-Type de la descarga sale de acá y no
 *  del que declaró el cliente. */
const TIPOS_COMPROBANTE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};

app.post<{ Params: { id: string } }>('/api/cars/:id/taller', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });

  let razon = '';
  let monto = 0;
  let archivo: { id: string; nombre: string; tipo: string } | null = null;

  try {
    for await (const parte of req.parts()) {
      if (parte.type === 'field') {
        if (parte.fieldname === 'razon') razon = String(parte.value).trim().slice(0, 120);
        if (parte.fieldname === 'monto') monto = Number(String(parte.value).replace(/\D/g, '')) || 0;
        continue;
      }
      if (parte.fieldname !== 'comprobante') {
        await parte.toBuffer();
        continue;
      }
      const ext = TIPOS_COMPROBANTE[parte.mimetype];
      if (!ext) {
        await parte.toBuffer();
        return reply.code(415).send({ error: 'El comprobante tiene que ser una foto o un PDF' });
      }
      const buf = await parte.toBuffer();
      if (!buf.length) continue;
      // El nombre del archivo lo inventa el servidor: usar el que manda el
      // cliente permitiría escribir fuera del directorio con un `../`.
      const id = randomUUID() + '.' + ext;
      await writeFile(join(COMPROBANTES_DIR, id), buf);
      archivo = { id, nombre: String(parte.filename || 'comprobante').slice(0, 120), tipo: parte.mimetype };
    }
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ error: 'El comprobante no puede pasar de 8 MB' });
    throw e;
  }

  if (!razon) return reply.code(400).send({ error: 'Indicá el motivo de la entrada a taller' });
  if (monto <= 0) return reply.code(400).send({ error: 'Indicá cuánto se gasta en el taller' });

  const hoy = new Date().toISOString().slice(0, 10);
  const info = db
    .prepare(
      `INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado, comprobante, comprobante_nombre, comprobante_tipo)
       VALUES (?, ?, 'egreso', ?, ?, ?, 'Taller', NULL, ?, ?, ?)`,
    )
    .run(u.id, car.id, monto, hoy, razon, archivo?.id ?? null, archivo?.nombre ?? null, archivo?.tipo ?? null);

  db.prepare("UPDATE cars SET estado = 'taller' WHERE id = ? AND owner_id = ?").run(car.id, u.id);
  req.log.info({ car: car.plate, monto, comprobante: !!archivo }, 'vehículo a taller');

  const mov = db.prepare('SELECT * FROM movs WHERE id = ?').get(info.lastInsertRowid) as MovRow;
  return reply.code(201).send({ car: carToJson(selCar.get(car.id, u.id) as CarRow), mov: movToJson(mov) });
});

/** Categorías válidas para un gasto suelto. Mismo set que `CATS` en el cliente. */
const CATS_EGRESO = new Set(['Taller', 'Combustible', 'Seguro', 'Multas', 'Documentación', 'Otros']);

/** Gasto genérico con comprobante opcional, sin efecto sobre el estado del auto:
 *  a diferencia de `/taller`, esta ruta no saca al vehículo de circulación —
 *  eso sigue siendo una decisión aparte, tomada en la ficha del auto. */
app.post<{ Params: { id: string } }>('/api/cars/:id/egreso', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });

  let razon = '';
  let monto = 0;
  let cat = '';
  let archivo: { id: string; nombre: string; tipo: string } | null = null;

  try {
    for await (const parte of req.parts()) {
      if (parte.type === 'field') {
        if (parte.fieldname === 'razon') razon = String(parte.value).trim().slice(0, 120);
        if (parte.fieldname === 'monto') monto = Number(String(parte.value).replace(/\D/g, '')) || 0;
        if (parte.fieldname === 'cat') cat = String(parte.value);
        continue;
      }
      if (parte.fieldname !== 'comprobante') {
        await parte.toBuffer();
        continue;
      }
      const ext = TIPOS_COMPROBANTE[parte.mimetype];
      if (!ext) {
        await parte.toBuffer();
        return reply.code(415).send({ error: 'El comprobante tiene que ser una foto o un PDF' });
      }
      const buf = await parte.toBuffer();
      if (!buf.length) continue;
      const id = randomUUID() + '.' + ext;
      await writeFile(join(COMPROBANTES_DIR, id), buf);
      archivo = { id, nombre: String(parte.filename || 'comprobante').slice(0, 120), tipo: parte.mimetype };
    }
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ error: 'El comprobante no puede pasar de 8 MB' });
    throw e;
  }

  if (!razon) return reply.code(400).send({ error: 'Indicá de qué es el gasto' });
  if (monto <= 0 || monto > 1_000_000_000) return reply.code(400).send({ error: 'Indicá cuánto se gastó' });
  if (!CATS_EGRESO.has(cat)) return reply.code(400).send({ error: 'Elegí una categoría válida' });

  const hoy = new Date().toISOString().slice(0, 10);
  const info = db
    .prepare(
      `INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado, comprobante, comprobante_nombre, comprobante_tipo)
       VALUES (?, ?, 'egreso', ?, ?, ?, ?, NULL, ?, ?, ?)`,
    )
    .run(u.id, car.id, monto, hoy, razon, cat, archivo?.id ?? null, archivo?.nombre ?? null, archivo?.tipo ?? null);

  req.log.info({ car: car.plate, cat, monto, comprobante: !!archivo }, 'gasto registrado');

  const mov = db.prepare('SELECT * FROM movs WHERE id = ?').get(info.lastInsertRowid) as MovRow;
  return reply.code(201).send({ mov: movToJson(mov) });
});

/** Descarga del comprobante. Se resuelve por el movimiento y no por el nombre
 *  del archivo, así que el id solo sirve si el movimiento es del que pregunta. */
app.get<{ Params: { id: string } }>('/api/comprobantes/:id', async (req, reply) => {
  const u = quien(req);
  type Fila = { comprobante: string; comprobante_nombre: string | null; comprobante_tipo: string | null };
  const fila =
    (db.prepare('SELECT comprobante, comprobante_nombre, comprobante_tipo FROM movs WHERE comprobante = ? AND owner_id = ?').get(req.params.id, u.id) as Fila | undefined) ??
    (db.prepare('SELECT comprobante, comprobante_nombre, comprobante_tipo FROM pagos WHERE comprobante = ? AND owner_id = ?').get(req.params.id, u.id) as Fila | undefined);
  if (!fila) return reply.code(404).send({ error: 'Comprobante inexistente' });

  // El tipo sale de la tabla blanca, no de lo que se guardó: si alguna vez
  // entrara un valor raro a la base, igual no se sirve como algo ejecutable.
  const tipo = fila.comprobante_tipo && TIPOS_COMPROBANTE[fila.comprobante_tipo] ? fila.comprobante_tipo : 'application/octet-stream';
  const nombre = (fila.comprobante_nombre ?? 'comprobante').replace(/[^\w.\- ]/g, '_');

  return reply
    .type(tipo)
    .header('Content-Disposition', `inline; filename="${nombre}"`)
    .header('X-Content-Type-Options', 'nosniff')
    .header('Content-Security-Policy', "default-src 'none'; sandbox")
    .header('Cache-Control', 'private, max-age=3600')
    .send(createReadStream(join(COMPROBANTES_DIR, fila.comprobante)));
});

/* ---------------------------- cobranza ---------------------------- */

interface NuevoPago {
  driver?: string;
  carId?: string | null;
  fecha?: string;
  monto?: number;
  tipo?: string;
  medio?: string;
  nota?: string;
}

/** Un pago se acepta solo para un chofer que la flota conoce, actual o pasado.
 *  Sin esto un nombre mal tipeado crea un saldo a favor fantasma que nunca se
 *  imputa a nada y desaparece de la vista del dueño. */
const conoceChofer = db.prepare(`
  SELECT 1 FROM drivers WHERE owner_id = ? AND nombre = ?
  UNION ALL
  SELECT 1 FROM movs WHERE owner_id = ? AND driver = ?
  UNION ALL
  SELECT 1 FROM pagos WHERE owner_id = ? AND driver = ?
  LIMIT 1
`);

app.post<{ Body: NuevoPago }>('/api/pagos', async (req, reply) => {
  const u = quien(req);
  const b = req.body ?? ({} as NuevoPago);

  const driver = String(b.driver ?? '').trim();
  if (!driver || driver === 'Sin chofer') return reply.code(400).send({ error: 'Indicá de qué chofer es el pago' });
  if (!conoceChofer.get(u.id, driver, u.id, driver, u.id, driver)) return reply.code(404).send({ error: 'Ese chofer no es de tu flota' });

  const monto = Number(b.monto);
  if (!Number.isInteger(monto) || monto <= 0 || monto > 1_000_000_000) return reply.code(400).send({ error: 'El monto tiene que ser un número mayor a cero' });

  const hoy = hoyISO();
  const fecha = String(b.fecha ?? hoy);
  if (!FECHA.test(fecha)) return reply.code(400).send({ error: 'Fecha inválida' });
  // Una fecha futura siempre es un error de tipeo, y adelanta caja que todavía
  // no existe: el saldo a favor ya cubre el caso de pagar por adelantado.
  if (fecha > hoy) return reply.code(400).send({ error: 'No se puede registrar un pago con fecha futura' });

  const tipo = b.tipo === 'ajuste' ? 'ajuste' : 'pago';

  // El auto es referencia, no destino: la imputación va por chofer. Si viene uno
  // ajeno se rechaza igual, para no guardar punteros a flotas de otros.
  let carId: string | null = null;
  if (b.carId) {
    if (!selCar.get(b.carId, u.id)) return reply.code(404).send({ error: 'Vehículo inexistente' });
    carId = b.carId;
  }

  const driverId = (db.prepare('SELECT id FROM drivers WHERE owner_id = ? AND nombre = ?').get(u.id, driver) as { id: number } | undefined)?.id ?? null;
  const info = db
    .prepare('INSERT INTO pagos (owner_id, car_id, driver, driver_id, fecha, monto, tipo, medio, nota) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(u.id, carId, driver, driverId, fecha, monto, tipo, String(b.medio ?? '').trim().slice(0, 40) || null, String(b.nota ?? '').trim().slice(0, 200) || null);

  req.log.info({ driver, monto, tipo, fecha }, 'pago registrado');
  return reply.code(201).send(pagoToJson(db.prepare('SELECT * FROM pagos WHERE id = ?').get(info.lastInsertRowid) as PagoRow));
});

/** Borrar es la única corrección posible: un pago no se edita, porque cambiarle
 *  el monto reescribiría en silencio a qué cuotas quedó imputado. */
app.delete<{ Params: { id: string } }>('/api/pagos/:id', async (req, reply) => {
  const u = quien(req);
  const fila = db.prepare('SELECT * FROM pagos WHERE id = ? AND owner_id = ?').get(Number(req.params.id), u.id) as PagoRow | undefined;
  if (!fila) return reply.code(404).send({ error: 'Pago inexistente' });
  db.prepare('DELETE FROM pagos WHERE id = ? AND owner_id = ?').run(fila.id, u.id);
  req.log.info({ id: fila.id, driver: fila.driver, monto: fila.monto }, 'pago eliminado');
  return { ok: true, monto: fila.monto, driver: fila.driver };
});

/* ------------------------------ chofer ------------------------------- */
/* apps/driver: sesión propia por Bearer token (no cookie, no comparte nada
 * con la sesión del dueño), y rutas de solo lectura/escritura acotadas a lo
 * que le corresponde a ese chofer puntual. */

app.post<{ Body: { usuario?: string; password?: string } }>('/api/chofer/login', async (req, reply) => {
  const usuario = String(req.body?.usuario ?? '').trim();
  const password = String(req.body?.password ?? '');
  const clave = `${req.ip}|chofer|${usuario.toLowerCase()}`;

  const espera = bloqueado(db, clave);
  if (espera) {
    registrarAuth(db, 'chofer_login_bloqueado', usuario || null, { ...ctxAuth(req), detalle: `${espera}s restantes` });
    return reply.code(429).send({ error: `Demasiados intentos. Probá de nuevo en ${Math.ceil(espera / 60)} minutos.` });
  }
  if (!usuario || !password) return reply.code(400).send({ error: 'Completá usuario y contraseña' });

  const fila = db.prepare(
    `SELECT d.id AS driver_id, d.nombre AS driver, d.driver_pass_hash, c.id AS car_id, c.cuota, c.plate, c.model, c.year
       FROM drivers d
       JOIN cars c ON c.driver_id = d.id AND c.estado <> 'baja'
      WHERE d.driver_username = ?`,
  ).get(usuario) as
    | { driver_id: number; driver: string; driver_pass_hash: string | null; car_id: string; cuota: number; plate: string; model: string; year: number }
    | undefined;

  const ok = fila?.driver_pass_hash ? await verifyPassword(password, fila.driver_pass_hash) : false;
  if (!ok) {
    registrarFallo(db, clave);
    registrarAuth(db, 'chofer_login_fallo', usuario || null, ctxAuth(req));
    return reply.code(401).send({ error: 'Usuario o contraseña incorrectos' });
  }

  limpiarFallos(db, clave);
  const { token } = crearSesionChofer(db, fila!.driver_id);
  registrarAuth(db, 'chofer_login_ok', fila!.driver, { ...ctxAuth(req), detalle: `usuario=${usuario}` });
  return {
    token,
    driver: fila!.driver,
    cuota: fila!.cuota,
    car: { plate: fila!.plate, model: fila!.model, year: fila!.year },
  };
});

app.post('/api/chofer/logout', async (req) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const s = quienChofer(db, req);
    borrarSesionChofer(db, auth.slice('Bearer '.length).trim());
    if (s) registrarAuth(db, 'chofer_logout', s.driver, ctxAuth(req));
  }
  return { ok: true };
});

interface DriverLocationBody {
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
  recordedAt?: unknown;
  mocked?: unknown;
}

app.post<{ Body: DriverLocationBody }>('/api/chofer/location', async (req, reply) => {
  const s = quienChofer(db, req);
  if (!s) return reply.code(401).send({ error: 'Sesión requerida' });

  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const accuracy = req.body?.accuracy == null ? null : Number(req.body.accuracy);
  const recorded = new Date(String(req.body?.recordedAt ?? ''));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return reply.code(400).send({ error: 'Coordenadas inválidas' });
  }
  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0)) {
    return reply.code(400).send({ error: 'Precisión inválida' });
  }
  if (Number.isNaN(recorded.getTime())) return reply.code(400).send({ error: 'Fecha de ubicación inválida' });
  if (recorded.getTime() > Date.now() + 5 * 60_000) return reply.code(400).send({ error: 'La ubicación no puede ser futura' });

  // Android puede marcar una ubicación proveniente de un proveedor de mock.
  // No es una defensa contra un cliente modificado, pero evita aceptar el caso
  // detectable sin impedir ubicaciones legítimas donde el campo no existe.
  if (req.body?.mocked === true) return reply.code(400).send({ error: 'La ubicación simulada no está permitida' });

  const recordedAt = recorded.toISOString();
  const receivedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO driver_locations (car_id, latitude, longitude, accuracy, recorded_at, received_at, mocked)
    VALUES (?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(car_id) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      accuracy = excluded.accuracy,
      recorded_at = excluded.recorded_at,
      received_at = excluded.received_at,
      mocked = excluded.mocked
    WHERE excluded.recorded_at >= driver_locations.recorded_at
  `).run(s.carId, latitude, longitude, accuracy, recordedAt, receivedAt);

  return { ok: true, recordedAt };
});

app.get('/api/chofer/me', async (req, reply) => {
  const s = quienChofer(db, req);
  if (!s) return reply.code(401).send({ error: 'Sesión requerida' });
  const car = db.prepare('SELECT plate, model, year, cuota FROM cars WHERE id = ?').get(s.carId) as { plate: string; model: string; year: number; cuota: number };
  return { driver: s.driver, cuota: car.cuota, car: { plate: car.plate, model: car.model, year: car.year } };
});

app.get('/api/chofer/resumen', async (req, reply) => {
  const s = quienChofer(db, req);
  if (!s) return reply.code(401).send({ error: 'Sesión requerida' });

  const flota = db.prepare('SELECT id, driver, cuota FROM cars WHERE owner_id = ?').all(s.ownerId) as { id: string; driver: string; cuota: number }[];
  const driverDeCar = new Map(flota.map((c) => [c.id, c.driver]));
  // Todo lo que sigue es de un solo chofer; la clave de imputación es su id.
  const choferDe = () => s.driverId;
  const esEste = (m: MovRow) => (m.driver_id != null ? m.driver_id === s.driverId : (m.driver ?? driverDeCar.get(m.car_id)) === s.driver);

  const cargos = (db.prepare("SELECT * FROM movs WHERE owner_id = ? AND type = 'ingreso'").all(s.ownerId) as MovRow[]).filter(esEste);
  const pagos = (db.prepare('SELECT * FROM pagos WHERE owner_id = ?').all(s.ownerId) as PagoRow[]).filter((p) =>
    p.driver_id != null ? p.driver_id === s.driverId : p.driver === s.driver,
  );
  const { cobrado, saldoAFavor } = imputar(cargos, pagos, choferDe);

  const deuda = cargos.reduce((a, m) => a + (m.amount - (cobrado.get(m.id) ?? 0)), 0);
  const aFavor = saldoAFavor.get(s.driverId) ?? 0;
  const estado = deuda > 0 ? 'atrasado' : aFavor > 0 ? 'adelantado' : 'al_dia';

  const pendientes = cargos
    .filter((m) => m.amount - (cobrado.get(m.id) ?? 0) > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  // No es una fecha de vencimiento futura (no existe ese concepto: los cargos
  // no se emiten solos, ver seed.ts) — es desde cuándo viene arrastrando la
  // cuota más vieja sin pagar.
  const atrasadoDesde = estado === 'atrasado' ? (pendientes[0]?.date ?? null) : null;

  const hoy = hoyISO();
  const cuota = flota.find((c) => c.id === s.carId)?.cuota ?? 0;
  const cobradoDelMes = cargos.filter((m) => m.date.slice(0, 7) === hoy.slice(0, 7)).reduce((a, m) => a + (cobrado.get(m.id) ?? 0), 0);
  const diasPagados = cuota > 0 ? Math.floor(cobradoDelMes / cuota) : 0;
  const diasTranscurridos = Number(hoy.slice(8, 10));

  return { estado, deuda, aFavor, cuota, atrasadoDesde, diasPagados, diasTranscurridos, cobradoMes: cobradoDelMes };
});

app.get<{ Querystring: { dias?: string } }>('/api/chofer/pagos', async (req, reply) => {
  const s = quienChofer(db, req);
  if (!s) return reply.code(401).send({ error: 'Sesión requerida' });

  const dias = Number(req.query.dias);
  const desde = Number.isFinite(dias) && dias > 0 ? new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10) : null;

  const all = db.prepare('SELECT * FROM pagos WHERE owner_id = ?').all(s.ownerId) as PagoRow[];
  let filas = all.filter((p) => (p.driver_id != null ? p.driver_id === s.driverId : p.driver === s.driver));
  if (desde) filas = filas.filter((p) => p.fecha >= desde);
  filas.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);

  return filas.map(pagoToJson);
});

app.post<{ Params: never }>('/api/chofer/pagos', async (req, reply) => {
  const s = quienChofer(db, req);
  if (!s) return reply.code(401).send({ error: 'Sesión requerida' });

  let monto = 0;
  let medio = '';
  let archivo: { id: string; nombre: string; tipo: string } | null = null;

  try {
    for await (const parte of req.parts()) {
      if (parte.type === 'field') {
        if (parte.fieldname === 'monto') monto = Number(String(parte.value).replace(/\D/g, '')) || 0;
        if (parte.fieldname === 'medio') medio = String(parte.value).trim().slice(0, 40);
        continue;
      }
      if (parte.fieldname !== 'comprobante') {
        await parte.toBuffer();
        continue;
      }
      const ext = TIPOS_COMPROBANTE[parte.mimetype];
      if (!ext) {
        await parte.toBuffer();
        return reply.code(415).send({ error: 'El comprobante tiene que ser una foto o un PDF' });
      }
      const buf = await parte.toBuffer();
      if (!buf.length) continue;
      const id = randomUUID() + '.' + ext;
      await writeFile(join(COMPROBANTES_DIR, id), buf);
      archivo = { id, nombre: String(parte.filename || 'comprobante').slice(0, 120), tipo: parte.mimetype };
    }
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ error: 'El comprobante no puede pasar de 8 MB' });
    throw e;
  }

  if (monto <= 0 || monto > 1_000_000_000) return reply.code(400).send({ error: 'El monto tiene que ser un número mayor a cero' });

  const hoy = hoyISO();
  const info = db
    .prepare('INSERT INTO pagos (owner_id, car_id, driver, driver_id, fecha, monto, tipo, medio, comprobante, comprobante_nombre, comprobante_tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(s.ownerId, s.carId, s.driver, s.driverId, hoy, monto, 'pago', medio || null, archivo?.id ?? null, archivo?.nombre ?? null, archivo?.tipo ?? null);

  req.log.info({ driver: s.driver, monto, medio, comprobante: !!archivo }, 'pago de chofer registrado');
  void sendOwnerPush(db, s.ownerId, {
    title: 'Pago recibido',
    body: `${s.driver} registró un pago de ₲ ${Math.round(monto).toLocaleString('es-PY')}.`,
    data: { type: 'driver_payment', paymentId: Number(info.lastInsertRowid), carId: s.carId ?? '' },
  }).catch((e: Error) => req.log.warn({ err: e, ownerId: s.ownerId }, 'no se pudo enviar push de pago'));
  return reply.code(201).send(pagoToJson(db.prepare('SELECT * FROM pagos WHERE id = ?').get(info.lastInsertRowid) as PagoRow));
});

/** Mismo set que muestra la pantalla "Nueva queja" del diseño. */
const CATS_REPORTE = new Set(['Frenos', 'Motor', 'Neumáticos', 'Aire acondicionado', 'Documentos', 'Otro']);

app.get('/api/chofer/reportes', async (req, reply) => {
  const s = quienChofer(db, req);
  if (!s) return reply.code(401).send({ error: 'Sesión requerida' });
  const filas = db
    .prepare('SELECT * FROM reportes_falla WHERE car_id = ? AND owner_id = ? AND (driver_id = ? OR driver = ?) ORDER BY fecha DESC, id DESC')
    .all(s.carId, s.ownerId, s.driverId, s.driver) as ReporteRow[];
  return filas.map(reporteToJson);
});

app.post<{ Body: { cat?: string; urgencia?: string; texto?: string } }>('/api/chofer/reportes', async (req, reply) => {
  const s = quienChofer(db, req);
  if (!s) return reply.code(401).send({ error: 'Sesión requerida' });

  const cat = String(req.body?.cat ?? '');
  const urgencia = req.body?.urgencia === 'urgente' ? 'urgente' : req.body?.urgencia === 'puedo' ? 'puedo' : '';
  const texto = String(req.body?.texto ?? '').trim().slice(0, 500);
  if (!CATS_REPORTE.has(cat)) return reply.code(400).send({ error: 'Elegí una categoría válida' });
  if (!urgencia) return reply.code(400).send({ error: 'Indicá la gravedad' });
  if (!texto) return reply.code(400).send({ error: 'Contá qué le pasa al auto' });

  const info = db
    .prepare('INSERT INTO reportes_falla (owner_id, car_id, driver, driver_id, cat, urgencia, texto, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(s.ownerId, s.carId, s.driver, s.driverId, cat, urgencia, texto, hoyISO());

  req.log.info({ driver: s.driver, cat, urgencia }, 'reporte de falla registrado');
  const car = db.prepare('SELECT plate FROM cars WHERE id = ?').get(s.carId) as { plate: string } | undefined;
  void sendOwnerPush(db, s.ownerId, {
    title: urgencia === 'urgente' ? 'Queja urgente' : 'Nueva queja del chofer',
    body: `${s.driver} reportó ${cat} en ${car?.plate ?? s.carId}: ${texto}`.slice(0, 180),
    data: { type: 'driver_report', reportId: Number(info.lastInsertRowid), carId: s.carId ?? '', urgency: urgencia },
  }).catch((e: Error) => req.log.warn({ err: e, ownerId: s.ownerId }, 'no se pudo enviar push de reporte'));
  return reply.code(201).send(reporteToJson(db.prepare('SELECT * FROM reportes_falla WHERE id = ?').get(info.lastInsertRowid) as ReporteRow));
});

/** Lectura del lado del dueño, sin transformar todavía en alertas: eso queda
 *  para cuando admin-web los sume a `alertList` (Service/Seguro/Taller). */
app.get('/api/reportes', async (req) => {
  const u = quien(req);
  const filas = db.prepare('SELECT * FROM reportes_falla WHERE owner_id = ? ORDER BY fecha DESC, id DESC').all(u.id) as ReporteRow[];
  return filas.map(reporteToJson);
});

/* --------------------------- SPA estática --------------------------- */

if (existsSync(PUBLIC_DIR)) {
  await app.register(fastifyStatic, { root: PUBLIC_DIR });
  // Rutas del cliente: cualquier 404 que no sea de la API cae en el index para
  // que el router del SPA resuelva, sin enmascarar errores reales del backend.
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'No encontrado' });
    return reply.sendFile('index.html');
  });
} else {
  app.log.warn({ PUBLIC_DIR }, 'sin build del frontend: se sirve solo la API');
}

/* ------------------------------ arranque ---------------------------- */

const cerrar = (sig: string) => {
  app.log.info({ sig }, 'cerrando');
  app.close().then(() => {
    db.close();
    process.exit(0);
  });
};
process.on('SIGTERM', () => cerrar('SIGTERM'));
process.on('SIGINT', () => cerrar('SIGINT'));

await app.listen({ port: PORT, host: '0.0.0.0' });
