import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { CarRow, MovRow } from './db.js';
import { DB_PATH, carToJson, movToJson, openDb } from './db.js';
import {
  COOKIE,
  bloqueado,
  borrarSesion,
  crearSesion,
  limpiarFallos,
  limpiarSesionesVencidas,
  migrarAuth,
  registrarFallo,
  sembrarAdmin,
  usuarioDeSesion,
  verifyPassword,
} from './auth.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = process.env.MIFLOTA_PUBLIC ?? join(HERE, '..', 'public');
const PORT = Number(process.env.PORT ?? 3000);

const db = openDb();
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

migrarAuth(db);
limpiarSesionesVencidas(db);
const adminCreado = await sembrarAdmin(db);
if (adminCreado) app.log.info({ usuario: adminCreado }, 'usuario inicial creado');

await app.register(fastifyCookie);

/* ------------------------------ sesión ------------------------------ */

/** Rutas que se pueden pedir sin sesión. Todo lo demás bajo /api la exige. */
const ABIERTAS = new Set(['/api/health', '/api/login', '/api/me']);

app.addHook('preHandler', async (req, reply) => {
  if (!req.url.startsWith('/api/')) return;
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

app.post<{ Body: { usuario?: string; password?: string } }>('/api/login', async (req, reply) => {
  const usuario = String(req.body?.usuario ?? '').trim();
  const password = String(req.body?.password ?? '');
  const clave = `${req.ip}|${usuario.toLowerCase()}`;

  const espera = bloqueado(clave);
  if (espera) return reply.code(429).send({ error: `Demasiados intentos. Probá de nuevo en ${Math.ceil(espera / 60)} minutos.` });
  if (!usuario || !password) return reply.code(400).send({ error: 'Completá usuario y contraseña' });

  const fila = db.prepare('SELECT id, usuario, nombre, pass_hash FROM users WHERE usuario = ?').get(usuario) as
    | { id: number; usuario: string; nombre: string; pass_hash: string }
    | undefined;

  // Mismo mensaje exista o no el usuario: distinguirlos permitiría enumerar cuentas.
  const ok = fila ? await verifyPassword(password, fila.pass_hash) : false;
  if (!ok) {
    registrarFallo(clave);
    return reply.code(401).send({ error: 'Usuario o contraseña incorrectos' });
  }

  limpiarFallos(clave);
  const { token, maxAge } = crearSesion(db, fila!.id);
  reply.setCookie(COOKIE, token, { ...cookieOpts, maxAge });
  return { usuario: fila!.usuario, nombre: fila!.nombre };
});

app.post('/api/logout', async (req, reply) => {
  borrarSesion(db, req.cookies[COOKIE]);
  reply.clearCookie(COOKIE, cookieOpts);
  return { ok: true };
});

app.get('/api/me', async (req) => {
  const u = usuarioDeSesion(db, req.cookies[COOKIE]);
  return u ? { autenticado: true, usuario: u.usuario, nombre: u.nombre } : { autenticado: false };
});

/* ------------------------------- API ------------------------------- */

// Toda lectura y escritura de flota lleva el owner en el WHERE: es lo único que
// impide que un usuario toque los vehículos de otro.
const selCars = db.prepare('SELECT * FROM cars WHERE owner_id = ? ORDER BY rowid');
const selMovs = db.prepare('SELECT * FROM movs WHERE owner_id = ? ORDER BY date DESC, id DESC');
const selCar = db.prepare('SELECT * FROM cars WHERE id = ? AND owner_id = ?');

/** El preHandler ya rechazó las peticiones sin sesión, así que acá siempre hay usuario. */
const quien = (req: { cookies: Record<string, string | undefined> }) => usuarioDeSesion(db, req.cookies[COOKIE])!;

app.get('/api/health', async () => ({ ok: true, db: DB_PATH }));

/** Un solo GET con todo: la vista deriva absolutamente todo de estas dos listas,
 *  así que partirlo en endpoints por pantalla solo agregaría viajes de red. */
app.get('/api/state', async (req) => {
  const u = quien(req);
  return {
    cars: (selCars.all(u.id) as CarRow[]).map(carToJson),
    movs: (selMovs.all(u.id) as MovRow[]).map(movToJson),
  };
});

const ESTADOS = new Set(['activo', 'taller', 'baja']);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

interface CarPatch {
  driver?: string;
  cuota?: number;
  estado?: string;
  gpsTag?: string;
  serviceCada?: number;
  serviceUnidad?: string;
  lastServiceDate?: string;
  vtvDate?: string;
  seguroDate?: string;
}

/** Mapea los campos que el cliente puede tocar a su columna, validando cada uno.
 *  Lo que no esté acá no es actualizable, aunque venga en el body. */
const CAMPOS: Record<keyof CarPatch, { col: string; ok: (v: unknown) => boolean }> = {
  driver: { col: 'driver', ok: (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 80 },
  cuota: { col: 'cuota', ok: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100_000_000 },
  estado: { col: 'estado', ok: (v) => typeof v === 'string' && ESTADOS.has(v) },
  gpsTag: { col: 'gps_tag', ok: (v) => typeof v === 'string' && v.length <= 40 },
  serviceCada: { col: 'service_cada', ok: (v) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 3650 },
  serviceUnidad: { col: 'service_unidad', ok: (v) => v === 'dias' || v === 'meses' },
  lastServiceDate: { col: 'last_service_date', ok: (v) => typeof v === 'string' && FECHA.test(v) },
  vtvDate: { col: 'vtv_date', ok: (v) => typeof v === 'string' && FECHA.test(v) },
  seguroDate: { col: 'seguro_date', ok: (v) => typeof v === 'string' && FECHA.test(v) },
};

app.patch<{ Params: { id: string }; Body: CarPatch }>('/api/cars/:id', async (req, reply) => {
  const u = quien(req);
  // Un vehículo de otro dueño responde igual que uno inexistente: distinguirlos
  // permitiría sondear qué ids existen en otras cuentas.
  const actual = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!actual) return reply.code(404).send({ error: 'Vehículo inexistente' });

  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [campo, def] of Object.entries(CAMPOS) as [keyof CarPatch, (typeof CAMPOS)[keyof CarPatch]][]) {
    const v = req.body?.[campo];
    if (v === undefined) continue;
    if (!def.ok(v)) return reply.code(400).send({ error: `Valor inválido para ${campo}` });
    sets.push(`${def.col} = ?`);
    vals.push(v);
  }
  if (!sets.length) return reply.code(400).send({ error: 'Nada para actualizar' });

  db.prepare(`UPDATE cars SET ${sets.join(', ')} WHERE id = ? AND owner_id = ?`).run(...vals, req.params.id, u.id);
  return carToJson(selCar.get(req.params.id, u.id) as CarRow);
});

interface NuevoCar {
  plate: string;
  model: string;
  year: number;
  driver: string;
  cuota: number;
  gpsTag?: string;
  lastServiceDate?: string;
  serviceCada?: number;
  serviceUnidad?: string;
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
  const car = {
    id: 'c' + Date.now().toString(36),
    owner_id: u.id,
    plate,
    model,
    year: Number.isInteger(b.year) && b.year > 1950 && b.year < 2100 ? b.year : 2018,
    driver: String(b.driver ?? '').trim() || 'Sin chofer',
    cuota: Number.isInteger(b.cuota) && b.cuota >= 0 ? b.cuota : 0,
    estado: 'activo',
    gps_tag: String(b.gpsTag ?? '').trim().slice(0, 40),
    service_cada: Number.isInteger(b.serviceCada) && b.serviceCada! >= 1 && b.serviceCada! <= 3650 ? b.serviceCada! : 6,
    service_unidad: b.serviceUnidad === 'dias' ? 'dias' : 'meses',
    last_service_date: typeof b.lastServiceDate === 'string' && FECHA.test(b.lastServiceDate) && b.lastServiceDate <= hoy ? b.lastServiceDate : hoy,
    vtv_date: enMeses(12),
    seguro_date: enMeses(12),
  };
  db.prepare(`
    INSERT INTO cars (id, owner_id, plate, model, year, driver, cuota, estado, gps_tag, service_cada, service_unidad, last_service_date, vtv_date, seguro_date)
    VALUES (@id, @owner_id, @plate, @model, @year, @driver, @cuota, @estado, @gps_tag, @service_cada, @service_unidad, @last_service_date, @vtv_date, @seguro_date)
  `).run(car);

  return reply.code(201).send(carToJson(selCar.get(car.id, u.id) as CarRow));
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
