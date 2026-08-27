import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { CarRow, GastoItemRow, LocationRow, MovRow, PagoRow, ReporteRow } from './db.js';
import { DB_PATH, carToJson, ensureDriver, locationToJson, movToJson, openDb, pagoToJson, reporteToJson } from './db.js';
import { borrarComprobante, COMPROBANTES_STORAGE, guardarComprobante, leerComprobante, type ComprobanteInput } from './comprobantes.js';
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
  revocarOtrasSesiones,
  revocarSesion,
  sembrarAdmin,
  sesionesDeUsuario,
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
import { answerAssistant, buildAssistantSnapshot, unavailableAssistantReply, type AssistantFile, type AssistantHistoryItem, type AssistantQueryGroup, type AssistantQueryRequest, type AssistantQueryResult, type AssistantQueryRow, type AssistantReportRequest } from './assistant.js';
import { sendOwnerPush } from './push.js';
import { startDailyAlertDigest } from './ownerNotifications.js';
import { localDateISO } from './time.js';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = process.env.MIFLOTA_PUBLIC ?? join(HERE, '..', 'public');
const PORT = Number(process.env.PORT ?? 3000);

/** Qué día es hoy para el servidor. La flota de demostración está fijada a una
 *  fecha (ver `TODAY` en el cliente), y sin poder alinear las dos el servidor
 *  rechazaría por "futuro" todo lo que se cargue desde esa app. En producción
 *  no se define y manda el reloj real. */
const hoyISO = () => localDateISO();
const diasEntreISO = (desde: string | null, hasta = hoyISO()) => (desde ? Math.floor((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000) : Number.POSITIVE_INFINITY);
const ASSISTANT_REPORTS_DIR = process.env.MIFLOTA_ASSISTANT_REPORTS ?? join(dirname(DB_PATH), 'assistant-reports');
await mkdir(ASSISTANT_REPORTS_DIR, { recursive: true });

interface AssistantReportFileRecord extends AssistantFile {
  path: string;
  ownerId: number;
  expiresAt: number;
}

const assistantReportFiles = new Map<string, AssistantReportFileRecord>();

const db = openDb();
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

app.log.info({ storage: COMPROBANTES_STORAGE }, 'almacenamiento de comprobantes inicializado');

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

/** Token de dueño del pedido: la cookie del navegador o, en admin-mobile, el
 *  bearer que la app guarda en SecureStore (misma tabla de sesiones para
 *  ambos: revocar desde un lado cierra los dos). */
const tokenDueno = (req: { cookies: Record<string, string | undefined>; headers: { authorization?: string | string[] } }): string | undefined => {
  const auth = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim();
  return req.cookies[COOKIE];
};

/** Rutas que se pueden pedir sin sesión. Todo lo demás bajo /api la exige. */
const ABIERTAS = new Set(['/api/health', '/api/login', '/api/me']);

app.addHook('preHandler', async (req, reply) => {
  if (!req.url.startsWith('/api/')) return;
  // El chofer no tiene sesión de dueño: estas rutas validan su propio Bearer
  // token adentro, con quienChofer(), en vez de la cookie de acá.
  if (req.url.startsWith('/api/chofer/')) return;
  // Los archivos de reportes llevan un token aleatorio con vencimiento propio;
  // eso permite abrirlos desde el navegador del teléfono sin copiar la sesión.
  if (req.url.startsWith('/api/assistant/files/')) return;
  if (req.url.startsWith('/api/reports/files/')) return;
  if (ABIERTAS.has(req.url.split('?')[0])) return;
  if (!usuarioDeSesion(db, tokenDueno(req))) return reply.code(401).send({ error: 'Sesión requerida' });
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
  const { token, maxAge } = crearSesion(db, fila!.id, ctxAuth(req));
  registrarAuth(db, 'login_ok', fila!.usuario, ctxAuth(req));
  reply.setCookie(COOKIE, token, { ...cookieOpts, maxAge });
  // El token también va en el cuerpo: admin-mobile lo guarda en SecureStore y
  // lo manda como Bearer (la cookie de RN no sobrevive un reinicio de la app).
  // El navegador lo ignora: sigue usando la cookie httpOnly.
  return { usuario: fila!.usuario, nombre: fila!.nombre, token };
});

app.post('/api/logout', async (req, reply) => {
  const token = tokenDueno(req);
  const u = usuarioDeSesion(db, token);
  borrarSesion(db, token);
  if (u) registrarAuth(db, 'logout', u.usuario, ctxAuth(req));
  reply.clearCookie(COOKIE, cookieOpts);
  return { ok: true };
});

/* ------------------- gestión de sesiones activas (dueño) ------------------- */

app.get('/api/sesiones', async (req) => {
  const u = quien(req);
  return sesionesDeUsuario(db, u.id, req.cookies[COOKIE]);
});

app.delete<{ Params: { id: string } }>('/api/sesiones/:id', async (req, reply) => {
  const u = quien(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Id inválido' });
  const actual = sesionesDeUsuario(db, u.id, req.cookies[COOKIE]).some((s) => s.id === id && s.actual);
  if (!revocarSesion(db, u.id, id)) return reply.code(404).send({ error: 'Sesión inexistente' });
  // Si se cerró la sesión con la que se pidió, la cookie ya no sirve: igual
  // contestamos 200 y el cliente reacciona al próximo 401.
  registrarAuth(db, 'sesion_revocada', u.usuario, { ...ctxAuth(req), detalle: `sesion=${id}${actual ? ' (actual)' : ''}` });
  return { ok: true };
});

/** "Cerrar sesión en todos lados": revoca todas menos la actual. */
app.delete('/api/sesiones', async (req) => {
  const u = quien(req);
  const n = revocarOtrasSesiones(db, u.id, req.cookies[COOKIE]);
  if (n > 0) registrarAuth(db, 'sesiones_revocadas', u.usuario, { ...ctxAuth(req), detalle: `${n} sesión(es)` });
  return { ok: true, cerradas: n };
});

/** El dueño cierra la app del chofer (todas sus sesiones). Útil cuando se
 *  cambió el teléfono o hay que sacarle el acceso sin esperar al reset. */
app.delete<{ Params: { id: string } }>('/api/choferes/:id/sesion', async (req, reply) => {
  const u = quien(req);
  const driver = db.prepare('SELECT id FROM drivers WHERE id = ? AND owner_id = ?').get(req.params.id, u.id) as { id: number } | undefined;
  if (!driver) return reply.code(404).send({ error: 'Chofer inexistente' });
  borrarSesionesDeDriver(db, driver.id);
  return { ok: true };
});

app.get('/api/me', async (req) => {
  const u = usuarioDeSesion(db, tokenDueno(req));
  return u
    ? { autenticado: true, usuario: u.usuario, nombre: u.nombre, rol: u.rol, estado: u.estado }
    : { autenticado: false };
});

/** Cambio de contraseña del dueño desde el panel. Pide la actual para que un
 *  teléfono perdido no sirva para secuestrar la cuenta, y al confirmar cierra
 *  las sesiones de los otros dispositivos (la actual queda activa). */
app.post<{ Body: { actual?: string; nueva?: string } }>('/api/me/password', async (req, reply) => {
  const u = quien(req);
  const actual = String(req.body?.actual ?? '');
  const nueva = String(req.body?.nueva ?? '');
  if (!actual || !nueva) return reply.code(400).send({ error: 'Completá la contraseña actual y la nueva' });
  if (nueva.length < 12) return reply.code(400).send({ error: 'La contraseña nueva debe tener al menos 12 caracteres' });

  const fila = db.prepare('SELECT pass_hash FROM users WHERE id = ?').get(u.id) as { pass_hash: string };
  if (!(await verifyPassword(actual, fila.pass_hash))) {
    registrarAuth(db, 'password_cambio_fallo', u.usuario, ctxAuth(req));
    return reply.code(401).send({ error: 'La contraseña actual es incorrecta' });
  }

  db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(await hashPassword(nueva), u.id);
  const cerradas = revocarOtrasSesiones(db, u.id, tokenDueno(req));
  registrarAuth(db, 'password_cambio', u.usuario, { ...ctxAuth(req), detalle: `sesiones cerradas: ${cerradas}` });
  return { ok: true, sesionesCerradas: cerradas };
});

/* ------------------------------- API ------------------------------- */

// Toda lectura y escritura de flota lleva el owner en el WHERE: es lo único que
// impide que un usuario toque los vehículos de otro.
const selCars = db.prepare('SELECT * FROM cars WHERE owner_id = ? ORDER BY rowid');
const selMovs = db.prepare('SELECT * FROM movs WHERE owner_id = ? ORDER BY date DESC, id DESC');
const selPagos = db.prepare('SELECT * FROM pagos WHERE owner_id = ? ORDER BY fecha DESC, id DESC');
const selCar = db.prepare('SELECT * FROM cars WHERE id = ? AND owner_id = ?');
const selItems = db.prepare('SELECT * FROM gasto_items WHERE mov_id = ? ORDER BY id');
const selLocations = db.prepare(`
  SELECT l.*
    FROM driver_locations l
    JOIN cars c ON c.id = l.car_id
   WHERE c.owner_id = ?
   ORDER BY l.received_at DESC
`);

/** El preHandler ya rechazó las peticiones sin sesión, así que acá siempre hay usuario. */
function isoOffset(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function reportRange(period: AssistantReportRequest['period'], to: string): string | null {
  if (period === 'week') return isoOffset(to, -6);
  if (period === 'month') return `${to.slice(0, 7)}-01`;
  return null;
}

function queryNormalise(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function queryRange(request: AssistantQueryRequest): { from: string | null; to: string } {
  const today = hoyISO();
  const to = request.period === 'personalizado' && request.to && FECHA.test(request.to) ? request.to : today;
  if (to > today) throw new Error('La consulta no puede usar una fecha futura');
  if (request.period === 'personalizado') {
    if (!request.from || !FECHA.test(request.from) || request.from > to) throw new Error('El período personalizado no es válido');
    return { from: request.from, to };
  }
  if (request.period === 'semana') return { from: isoOffset(to, -6), to };
  if (request.period === 'mes') return { from: `${to.slice(0, 7)}-01`, to };
  if (request.period === '90dias') return { from: isoOffset(to, -89), to };
  return { from: null, to };
}

function queryMoney(value: number): string {
  return reportMoney(value);
}

/** Ejecuta las consultas que pide el modelo sobre filas ya aisladas por dueño.
 * No acepta SQL ni nombres de columnas: sólo las dimensiones explícitas del
 * contrato, así una pregunta libre no puede escapar del owner autenticado. */
function queryFleetData(ownerId: number, request: AssistantQueryRequest): AssistantQueryResult {
  const entity = request.entity;
  const metric = request.metric ?? (entity === 'gastos' ? 'gastos' : entity === 'pagos' ? 'cobrado' : entity === 'deudas' ? 'deuda' : entity === 'vehiculos' ? 'cantidad' : 'facturado');
  const groupBy = request.groupBy ?? (entity === 'deudas' ? 'chofer' : 'ninguno');
  const range = queryRange(request);
  const cars = selCars.all(ownerId) as CarRow[];
  const movements = selMovs.all(ownerId) as MovRow[];
  const payments = selPagos.all(ownerId) as PagoRow[];
  const carById = new Map(cars.map((car) => [car.id, car]));
  const vehicleTerm = queryNormalise(request.vehicle ?? '');
  const categoryTerm = queryNormalise(request.category ?? '');
  const driverTerm = queryNormalise(request.driver ?? '');
  const allowedCarIds = new Set(cars.filter((car) => !vehicleTerm || queryNormalise(`${car.id} ${car.plate} ${car.model}`).includes(vehicleTerm)).map((car) => car.id));
  if (vehicleTerm && !allowedCarIds.size) return { entity, metric, groupBy, from: range.from, to: range.to, rows: [] };
  const carAllowed = (carId: string | null) => !vehicleTerm || (carId !== null && allowedCarIds.has(carId));
  const dateAllowed = (date: string) => date <= range.to && (!range.from || date >= range.from);
  const driverOf = (mov: MovRow) => mov.driver || carById.get(mov.car_id)?.driver || 'Sin chofer';
  const carLabel = (carId: string | null) => {
    const car = carId ? carById.get(carId) : undefined;
    return car ? `${car.plate} · ${car.model}` : 'Sin vehículo';
  };
  const groupLabel = (group: AssistantQueryGroup, carId: string | null, driver: string, category?: string, date?: string) => {
    if (group === 'auto') return carLabel(carId);
    if (group === 'modelo') return carId ? (carById.get(carId)?.model || 'Sin modelo') : 'Sin modelo';
    if (group === 'chofer') return driver || 'Sin chofer';
    if (group === 'categoria') return category || 'Sin categoría';
    if (group === 'fecha') return date || 'Sin fecha';
    return 'Total';
  };
  const rows: AssistantQueryRow[] = [];

  if (entity === 'vehiculos') {
    const filtered = cars.filter((car) => carAllowed(car.id) && (!driverTerm || queryNormalise(car.driver).includes(driverTerm)));
    return {
      entity, metric, groupBy, from: range.from, to: range.to,
      rows: filtered.slice(0, 50).map((car) => ({
        label: car.plate,
        subtitle: car.model,
        carId: car.id,
        details: {
          Modelo: car.model,
          Año: String(car.year),
          Chofer: car.driver || 'Sin chofer',
          Estado: car.estado,
          'Último service': car.last_service_date || 'Sin datos',
          'Service cada': car.service_cada ? `${car.service_cada} ${car.service_unidad || 'km'}` : 'Sin datos',
          Seguro: car.seguro_nombre || 'Sin datos',
          'Vencimiento seguro': car.seguro_date || 'Sin datos',
          Kilometraje: car.kilometraje == null ? 'Sin datos' : String(car.kilometraje),
          'Kilometraje actualizado': car.kilometraje_actualizado || 'Sin datos',
        },
      })),
    };
  }

  if (entity === 'deudas') {
    const charges = movements.filter((mov) => mov.type === 'ingreso' && mov.date <= range.to && carAllowed(mov.car_id));
    const availablePayments = payments.filter((payment) => payment.fecha <= range.to && carAllowed(payment.car_id));
    const { cobrado } = imputar(charges, availablePayments, driverOf);
    const grouped = new Map<string, { value: number; count: number; subtitle: string }>();
    for (const charge of charges) {
      const driver = driverOf(charge);
      if (driverTerm && !queryNormalise(driver).includes(driverTerm)) continue;
      const current = grouped.get(driver) ?? { value: 0, count: 0, subtitle: '' };
      current.value += Math.max(0, charge.amount - (cobrado.get(charge.id) ?? 0));
      current.count += 1;
      current.subtitle = carById.get(charge.car_id)?.plate ?? '';
      grouped.set(driver, current);
    }
    for (const [label, item] of grouped) rows.push({ label, value: item.value, displayValue: queryMoney(item.value), subtitle: `${item.count} cuotas · ${item.subtitle || 'sin auto'}` });
  } else {
    const grouped = new Map<string, { value: number; count: number; subtitle: string; carId?: string; details?: Record<string, string> }>();
    const add = (label: string, value: number, subtitle: string, carId?: string, details?: Record<string, string>) => {
      const current = grouped.get(label) ?? { value: 0, count: 0, subtitle, carId, details };
      current.value += value;
      current.count += 1;
      if (carId) current.carId = carId;
      grouped.set(label, current);
    };
    const isGrouped = groupBy !== 'ninguno' || entity === 'finanzas';
    const wantsBilled = metric === 'facturado';
    const wantsCollected = metric === 'cobrado';
    const wantsExpenses = metric === 'gastos';
    const wantsNet = metric === 'ganancia';
    if (entity === 'finanzas' || entity === 'movimientos') {
      for (const mov of movements) {
        if (!dateAllowed(mov.date) || !carAllowed(mov.car_id)) continue;
        const driver = driverOf(mov);
        const category = mov.cat ?? 'Sin categoría';
        if (driverTerm && !queryNormalise(driver).includes(driverTerm)) continue;
        if (categoryTerm && !queryNormalise(category).includes(categoryTerm)) continue;
        const isIncome = mov.type === 'ingreso';
        if (entity === 'movimientos' || wantsBilled || wantsExpenses || wantsNet) {
          if (entity === 'finanzas' && ((wantsBilled && !isIncome) || (wantsExpenses && isIncome))) continue;
          if (entity === 'finanzas' && wantsNet) {
            const value = isIncome ? 0 : -mov.amount;
            const label = groupLabel(groupBy, mov.car_id, driver, category, mov.date);
            if (isGrouped) add(label, value, `${mov.date} · ${category}`, mov.car_id, { Fecha: mov.date, Vehículo: carLabel(mov.car_id), Categoría: category });
          } else {
            const value = entity === 'movimientos' ? 1 : mov.amount;
            const label = groupLabel(groupBy, mov.car_id, driver, category, mov.date);
            if (isGrouped) add(label, value, `${mov.date} · ${category}`, mov.car_id, { Fecha: mov.date, Vehículo: carLabel(mov.car_id), Categoría: category });
            else rows.push({ label: mov.descripcion || category, value, displayValue: queryMoney(value), subtitle: `${mov.date} · ${carLabel(mov.car_id)}`, carId: mov.car_id, details: { Fecha: mov.date, Vehículo: carLabel(mov.car_id), Categoría: category, Tipo: isIncome ? 'Facturado' : 'Gasto' } });
          }
        }
      }
    }
    if (entity === 'finanzas' || entity === 'pagos') {
      for (const payment of payments) {
        if (payment.tipo !== 'pago' || !dateAllowed(payment.fecha) || !carAllowed(payment.car_id)) continue;
        if (driverTerm && !queryNormalise(payment.driver).includes(driverTerm)) continue;
        if (!(entity === 'pagos' || wantsCollected || wantsNet)) continue;
        const label = groupLabel(groupBy, payment.car_id, payment.driver, undefined, payment.fecha);
        if (isGrouped) add(label, payment.monto, `${payment.fecha} · ${payment.driver}`, payment.car_id ?? undefined, { Fecha: payment.fecha, Vehículo: carLabel(payment.car_id), Chofer: payment.driver });
        else rows.push({ label: payment.nota || 'Pago', value: payment.monto, displayValue: queryMoney(payment.monto), subtitle: `${payment.fecha} · ${payment.driver}`, carId: payment.car_id ?? undefined, details: { Fecha: payment.fecha, Vehículo: carLabel(payment.car_id), Chofer: payment.driver, Medio: payment.medio || 'Sin medio' } });
      }
    }
    if (entity === 'gastos') {
      for (const mov of movements) {
        if (mov.type !== 'egreso' || !dateAllowed(mov.date) || !carAllowed(mov.car_id)) continue;
        const category = mov.cat ?? 'Sin categoría';
        if (categoryTerm && !queryNormalise(category).includes(categoryTerm)) continue;
        const label = groupLabel(groupBy, mov.car_id, driverOf(mov), category, mov.date);
        const items = selItems.all(mov.id) as GastoItemRow[];
        const parts = items.map((item) => `${item.cantidad} x ${item.nombre} (${queryMoney(item.costo_unitario)})`).join('; ');
        if (groupBy === 'ninguno') rows.push({ label: mov.descripcion || category, value: mov.amount, displayValue: queryMoney(mov.amount), subtitle: `${mov.date} · ${carLabel(mov.car_id)}`, carId: mov.car_id, details: { Fecha: mov.date, Vehículo: carLabel(mov.car_id), Categoría: category, Repuestos: parts || 'Sin detalle', 'Mano de obra': queryMoney(mov.mano_obra ?? 0) } });
        else add(label, mov.amount, `${mov.date} · ${category}`, mov.car_id, { Fecha: mov.date, Vehículo: carLabel(mov.car_id), Categoría: category });
      }
    }
    for (const [label, item] of grouped) rows.push({ label, value: item.value, displayValue: metric === 'cantidad' ? String(item.count) : queryMoney(item.value), subtitle: `${item.count} registro${item.count === 1 ? '' : 's'} · ${item.subtitle}`, carId: item.carId, details: item.details });
  }

  const sorted = rows.slice().sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || a.label.localeCompare(b.label));
  const limit = Math.min(50, Math.max(1, request.limit ?? 20));
  const resultRows = sorted.slice(0, limit);
  const total = rows.reduce((sum, row) => sum + (row.value ?? 0), 0);
  return { entity, metric, groupBy, from: range.from, to: range.to, total, rows: resultRows };
}

function reportMoney(value: number): string {
  // Helvetica no contiene correctamente el símbolo ₲ y PDFKit lo termina
  // mostrando como un carácter extraño. "Gs." es claro y seguro en cualquier
  // visor de PDF, incluido el visor de Chrome en Android.
  return 'Gs. ' + new Intl.NumberFormat('es-PY').format(Math.round(value));
}

/** Nombre legible y único para las descargas. Se usa la hora de Paraguay
 * aunque el proceso de la API esté corriendo en UTC en la VPS. */
function reportFileTimestamp(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Asuncion',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now).reduce<Record<string, string>>((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
}

async function createAssistantReport(ownerId: number, request: AssistantReportRequest): Promise<AssistantFile> {
  const to = hoyISO();
  const from = reportRange(request.period, to);
  const cars = selCars.all(ownerId) as CarRow[];
  const carById = new Map(cars.map((car) => [car.id, car]));
  const movements = (selMovs.all(ownerId) as MovRow[]).filter((mov) => {
    if (mov.type !== 'egreso' || mov.date > to || (from && mov.date < from)) return false;
    const car = carById.get(mov.car_id);
    if (request.vehicle && !car?.plate.toUpperCase().includes(request.vehicle.toUpperCase())) return false;
    if (request.category && (mov.cat ?? 'Otro').toLowerCase() !== request.category.toLowerCase()) return false;
    return true;
  });
  const rows = movements.map((mov) => {
    const car = carById.get(mov.car_id);
    const items = selItems.all(mov.id) as GastoItemRow[];
    const repuestos = items.reduce((sum, item) => sum + item.subtotal, 0);
    return {
      fecha: mov.date,
      vehiculo: car?.plate ?? 'Vehículo eliminado',
      categoria: mov.cat ?? 'Otro',
      detalle: mov.descripcion,
      repuestos,
      manoObra: mov.mano_obra ?? 0,
      total: items.length ? repuestos + (mov.mano_obra ?? 0) : mov.amount,
      items: items.map((item) => `${item.cantidad} x ${item.nombre} (${reportMoney(item.costo_unitario)})`).join('; '),
      itemRows: items,
    };
  });
  const periodLabel = from ? `${from} a ${to}` : `Hasta ${to}`;
  const extension = request.format === 'xlsx' ? 'xlsx' : 'pdf';
  const id = randomUUID();
  const name = `MiFlota-${request.report}-${reportFileTimestamp()}-${id.slice(0, 8)}.${extension}`;
  const path = join(ASSISTANT_REPORTS_DIR, name);
  let data: Buffer;
  if (request.format === 'xlsx') {
    const sheetRows = rows.map((row) => [row.fecha, row.vehiculo, row.categoria, row.detalle, row.total]);
    const sheet = XLSX.utils.aoa_to_sheet([['Fecha', 'Vehículo', 'Categoría', 'Descripción', 'Total gasto'], ...sheetRows]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Gastos');
    data = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  } else {
    data = await pdfFromFleetReport({
      periodLabel,
      generatedAt: to,
      incomeRows: [],
      expenseRows: rows.map((row) => ({
        fecha: row.fecha,
        vehiculo: row.vehiculo,
        categoria: row.categoria,
        detalle: row.detalle,
        items: row.itemRows,
        repuestos: row.repuestos,
        manoObra: row.manoObra,
        total: row.total,
      })),
      incomeTotal: 0,
      expenseTotal: rows.reduce((sum, row) => sum + row.total, 0),
      resultTotal: -rows.reduce((sum, row) => sum + row.total, 0),
    });
  }
  await writeFile(path, data);
  const record: AssistantReportFileRecord = { name, url: `/api/assistant/files/${id}`, mimeType: extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf', path, ownerId, expiresAt: Date.now() + 30 * 60_000 };
  assistantReportFiles.set(id, record);
  setTimeout(() => {
    assistantReportFiles.delete(id);
    void rm(path, { force: true }).catch(() => {});
  }, 30 * 60_000).unref();
  return { name: record.name, url: record.url, mimeType: record.mimeType };
}

type FleetReportPeriod = 'semana' | 'mes' | 'jul' | 'd90' | 'custom';
type FleetReportInclude = 'gastos' | 'ingresos' | 'ambos';
type FleetReportSelection = 'todos' | string[];
type FleetReportCategorySelection = 'todas' | string[];

interface FleetReportExportBody {
  period?: { type?: FleetReportPeriod; from?: string; to?: string };
  include?: FleetReportInclude;
  carIds?: FleetReportSelection;
  categories?: FleetReportCategorySelection;
  search?: string;
  format?: 'pdf' | 'xlsx';
}

interface FleetReportExpenseRow {
  fecha: string;
  vehiculo: string;
  categoria: string;
  detalle: string;
  items: GastoItemRow[];
  repuestos: number;
  manoObra: number;
  total: number;
}

interface FleetReportIncomeRow {
  fecha: string;
  vehiculo: string;
  chofer: string;
  monto: number;
  nota: string;
}

const REPORT_COLORS = {
  ink: '#1b1a17',
  muted: '#6b665c',
  orange: '#eda332',
  orangeLight: '#fff0d8',
  paper: '#fffdf9',
  line: '#e7dfd2',
  green: '#2d8666',
  red: '#c85c45',
};

function pdfCell(value: string | number | null | undefined, maxLength = 42): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

async function pdfFromFleetReport(data: {
  periodLabel: string;
  generatedAt: string;
  incomeRows: FleetReportIncomeRow[];
  expenseRows: FleetReportExpenseRow[];
  incomeTotal: number;
  expenseTotal: number;
  resultTotal: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks: Buffer[] = [];
    const margin = 36;
    const width = doc.page.width - margin * 2;

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageHeader = () => {
      doc.roundedRect(margin, margin, width, 82, 14).fill(REPORT_COLORS.ink);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text('MiFlota', margin + 18, margin + 16);
      doc.font('Helvetica').fontSize(10).text('Reporte financiero de la flota', margin + 19, margin + 47);
      doc.fontSize(9).text(`Generado: ${data.generatedAt}`, margin + width - 190, margin + 21, { width: 172, align: 'right' });
      doc.text(data.periodLabel, margin + width - 190, margin + 43, { width: 172, align: 'right' });
      doc.y = margin + 102;
    };

    const ensureSpace = (height: number) => {
      if (doc.y + height <= doc.page.height - margin) return;
      doc.addPage();
      pageHeader();
    };

    const sectionTitle = (title: string, subtitle?: string) => {
      ensureSpace(42);
      doc.fillColor(REPORT_COLORS.ink).font('Helvetica-Bold').fontSize(16).text(title, margin, doc.y);
      if (subtitle) doc.fillColor(REPORT_COLORS.muted).font('Helvetica').fontSize(9).text(subtitle, margin, doc.y + 4);
      doc.moveTo(margin, doc.y + 11).lineTo(margin + width, doc.y + 11).lineWidth(1).strokeColor(REPORT_COLORS.line).stroke();
      doc.y += subtitle ? 27 : 22;
    };

    const drawTable = (headers: string[], rows: string[][], columnWidths: number[], alignments: ('left' | 'right')[] = []) => {
      const rowHeight = 23;
      const drawHeader = () => {
        const headerY = doc.y;
        doc.roundedRect(margin, headerY, width, rowHeight, 5).fill(REPORT_COLORS.orange);
        let x = margin;
        headers.forEach((header, index) => {
          doc.fillColor(REPORT_COLORS.ink).font('Helvetica-Bold').fontSize(8).text(header, x + 7, headerY + 7, { width: columnWidths[index] - 14, align: alignments[index] ?? 'left', lineBreak: false });
          x += columnWidths[index];
        });
        doc.y = headerY + rowHeight;
      };
      ensureSpace(rowHeight + 5);
      drawHeader();
      rows.forEach((row, rowIndex) => {
        if (doc.y + rowHeight > doc.page.height - margin) {
          doc.addPage();
          pageHeader();
          drawHeader();
        }
        const rowY = doc.y;
        if (rowIndex % 2 === 0) doc.rect(margin, rowY, width, rowHeight).fill(REPORT_COLORS.orangeLight);
        let x = margin;
        row.forEach((cell, index) => {
          doc.fillColor(REPORT_COLORS.ink).font('Helvetica').fontSize(8).text(pdfCell(cell, 34), x + 7, rowY + 7, { width: columnWidths[index] - 14, align: alignments[index] ?? 'left', lineBreak: false });
          x += columnWidths[index];
        });
        doc.moveTo(margin, rowY + rowHeight).lineTo(margin + width, rowY + rowHeight).lineWidth(0.5).strokeColor(REPORT_COLORS.line).stroke();
        doc.y = rowY + rowHeight;
      });
      doc.y += 12;
    };

    pageHeader();
    const cardGap = 9;
    const cardWidth = (width - cardGap * 2) / 3;
    const summaryCards = [
      ['Cobrado', data.incomeTotal, REPORT_COLORS.green],
      ['Gastos', data.expenseTotal, REPORT_COLORS.orange],
      ['Resultado', data.resultTotal, data.resultTotal < 0 ? REPORT_COLORS.red : REPORT_COLORS.green],
    ] as const;
    const summaryY = doc.y;
    summaryCards.forEach(([label, amount, color], index) => {
      const x = margin + index * (cardWidth + cardGap);
      doc.roundedRect(x, summaryY, cardWidth, 66, 10).fill(REPORT_COLORS.paper).stroke(REPORT_COLORS.line);
      doc.fillColor(REPORT_COLORS.muted).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), x + 12, summaryY + 12);
      doc.fillColor(color).font('Helvetica-Bold').fontSize(15).text(reportMoney(amount), x + 12, summaryY + 32, { width: cardWidth - 24, lineBreak: false });
    });
    doc.y = summaryY + 84;
    doc.fillColor(REPORT_COLORS.muted).font('Helvetica').fontSize(9).text(`${data.incomeRows.length + data.expenseRows.length} movimientos incluidos · datos filtrados según la selección`, margin, doc.y);
    doc.y += 22;

    if (data.incomeRows.length) {
      sectionTitle('Ingresos cobrados', `${data.incomeRows.length} cobro(s)`);
      drawTable(
        ['Fecha', 'Vehículo', 'Chofer', 'Monto', 'Nota'],
        data.incomeRows.map((row) => [row.fecha, row.vehiculo, row.chofer, reportMoney(row.monto), row.nota]),
        [59, 92, 118, 82, width - 351],
        ['left', 'left', 'left', 'right', 'left'],
      );
    }
    if (data.expenseRows.length) {
      sectionTitle('Gastos', `${data.expenseRows.length} gasto(s)`);
      drawTable(
        ['Fecha', 'Vehículo', 'Categoría', 'Descripción', 'Total'],
        data.expenseRows.map((row) => [row.fecha, row.vehiculo, row.categoria, row.detalle, reportMoney(row.total)]),
        [62, 100, 86, width - 350, 102],
        ['left', 'left', 'left', 'left', 'right'],
      );
    }
    if (!data.incomeRows.length && !data.expenseRows.length) {
      doc.roundedRect(margin, doc.y, width, 60, 10).fill(REPORT_COLORS.orangeLight);
      doc.fillColor(REPORT_COLORS.muted).font('Helvetica-Bold').fontSize(11).text('No hay datos para los filtros elegidos.', margin + 16, doc.y + 23);
    }
    doc.end();
  });
}

function reportPeriodRange(period: FleetReportExportBody['period']): { from: string; to: string } | null {
  const type = period?.type;
  const to = String(period?.to ?? hoyISO());
  const from = String(period?.from ?? '');
  if (!['semana', 'mes', 'jul', 'd90', 'custom'].includes(type ?? '') || !FECHA.test(to)) return null;
  if (from && (!FECHA.test(from) || from > to)) return null;
  if (type === 'custom' && !from) return null;
  if (from) return { from, to };
  if (type === 'semana') return { from: isoOffset(to, -6), to };
  if (type === 'mes') return { from: `${to.slice(0, 7)}-01`, to };
  if (type === 'jul') {
    const pivot = new Date(to + 'T12:00:00');
    const previous = new Date(pivot.getFullYear(), pivot.getMonth() - 1, 1, 12);
    const last = new Date(pivot.getFullYear(), pivot.getMonth(), 0, 12);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: iso(previous), to: iso(last) };
  }
  if (type === 'd90') return { from: isoOffset(to, -89), to };
  return { from: '1970-01-01', to };
}

function reportSelection(value: FleetReportSelection | undefined): 'todos' | Set<string> {
  if (value === 'todos' || value === undefined) return 'todos';
  if (!Array.isArray(value)) return new Set();
  return new Set(value.map((id) => String(id).trim()).filter(Boolean));
}

async function createFleetReport(ownerId: number, body: FleetReportExportBody): Promise<{ file: AssistantFile; counts: { ingresos: number; gastos: number; total: number } }> {
  const include = body.include;
  const format = body.format;
  const range = reportPeriodRange(body.period);
  if (!range || !['gastos', 'ingresos', 'ambos'].includes(include ?? '') || !['pdf', 'xlsx'].includes(format ?? '')) throw new Error('Los filtros del reporte no son válidos');

  const cars = selCars.all(ownerId) as CarRow[];
  const carById = new Map(cars.map((car) => [car.id, car]));
  const selectedCars = reportSelection(body.carIds);
  if (selectedCars !== 'todos' && [...selectedCars].some((id) => !carById.has(id))) throw new Error('Uno de los vehículos no pertenece a tu flota');
  const selectedCategories = body.categories === 'todas' ? 'todos' : reportSelection(body.categories);
  const carAllowed = (carId: string | null) => selectedCars === 'todos' || (carId !== null && selectedCars.has(carId));
  const categoryAllowed = (category: string) => selectedCategories === 'todos' || selectedCategories.has(category);
  const search = String(body.search ?? '').trim().toLocaleLowerCase();
  const matchesSearch = (...fields: unknown[]) => !search || fields.some((field) => String(field ?? '').toLocaleLowerCase().includes(search));

  const incomeRows: FleetReportIncomeRow[] = include === 'gastos' ? [] : (selPagos.all(ownerId) as PagoRow[])
    .filter((pago) => pago.tipo === 'pago' && pago.fecha >= range.from && pago.fecha <= range.to && carAllowed(pago.car_id))
    .filter((pago) => matchesSearch('Pago recibido', 'Pago', carById.get(pago.car_id ?? '')?.plate, carById.get(pago.car_id ?? '')?.model, pago.driver, pago.nota, pago.medio))
    .map((pago) => ({ fecha: pago.fecha, vehiculo: carById.get(pago.car_id ?? '')?.plate ?? 'Sin vehículo', chofer: pago.driver || 'Sin chofer', monto: pago.monto, nota: pago.nota || '' }));

  const expenseRows: FleetReportExpenseRow[] = include === 'ingresos' ? [] : (selMovs.all(ownerId) as MovRow[])
    .filter((mov) => mov.type === 'egreso' && mov.date >= range.from && mov.date <= range.to && carAllowed(mov.car_id) && categoryAllowed(mov.cat || 'Otros'))
    .filter((mov) => {
      const car = carById.get(mov.car_id);
      return matchesSearch(mov.descripcion, mov.cat || 'Otros', car?.plate, car?.model, car?.driver);
    })
    .map((mov) => {
      const items = selItems.all(mov.id) as GastoItemRow[];
      const repuestos = items.reduce((sum, item) => sum + item.subtotal, 0);
      const manoObra = mov.mano_obra ?? 0;
      return { fecha: mov.date, vehiculo: carById.get(mov.car_id)?.plate ?? 'Vehículo eliminado', categoria: mov.cat || 'Otros', detalle: mov.descripcion, items, repuestos, manoObra, total: items.length ? repuestos + manoObra : mov.amount };
    });

  const counts = { ingresos: incomeRows.length, gastos: expenseRows.length, total: incomeRows.length + expenseRows.length };
  if (!counts.total) throw new Error('No hay datos para los filtros elegidos');

  const incomeTotal = incomeRows.reduce((sum, row) => sum + row.monto, 0);
  const expenseTotal = expenseRows.reduce((sum, row) => sum + row.total, 0);
  const resultTotal = incomeTotal - expenseTotal;
  const periodLabel = `${range.from} a ${range.to}`;
  const extension = format === 'xlsx' ? 'xlsx' : 'pdf';
  const id = randomUUID();
  const name = `MiFlota-reporte-${reportFileTimestamp()}-${id.slice(0, 8)}.${extension}`;
  const path = join(ASSISTANT_REPORTS_DIR, name);
  let data: Buffer;

  if (format === 'xlsx') {
    const book = XLSX.utils.book_new();
    const summary = [
      ['MiFlota · Reporte detallado'],
      ['Período', periodLabel],
      ['Ingresos cobrados', incomeTotal],
      ['Gastos', expenseTotal],
      ['Resultado', resultTotal],
      ['Movimientos', counts.total],
    ];
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(summary), 'Resumen');
    if (incomeRows.length) {
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
        ['Fecha', 'Vehículo', 'Chofer', 'Monto', 'Nota'],
        ...incomeRows.map((row) => [row.fecha, row.vehiculo, row.chofer, row.monto, row.nota]),
      ]), 'Ingresos');
    }
    if (expenseRows.length) {
      const detailRows: (string | number)[][] = [['Fecha', 'Vehículo', 'Categoría', 'Descripción', 'Total gasto']];
      expenseRows.forEach((row) => detailRows.push([row.fecha, row.vehiculo, row.categoria, row.detalle, row.total]));
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(detailRows), 'Gastos');
    }
    data = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  } else {
    data = await pdfFromFleetReport({
      periodLabel,
      generatedAt: `${hoyISO()} · ${reportFileTimestamp().slice(11).replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3')}`,
      incomeRows,
      expenseRows,
      incomeTotal,
      expenseTotal,
      resultTotal,
    });
  }

  await writeFile(path, data);
  const mimeType = extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
  const record: AssistantReportFileRecord = { name, url: `/api/reports/files/${id}`, mimeType, path, ownerId, expiresAt: Date.now() + 30 * 60_000 };
  assistantReportFiles.set(id, record);
  setTimeout(() => {
    assistantReportFiles.delete(id);
    void rm(path, { force: true }).catch(() => {});
  }, 30 * 60_000).unref();
  return { file: { name: record.name, url: record.url, mimeType: record.mimeType }, counts };
}

const quien = (req: { cookies: Record<string, string | undefined>; headers: { authorization?: string | string[] } }) => usuarioDeSesion(db, tokenDueno(req))!;

app.get('/api/health', async () => ({ ok: true, db: DB_PATH }));

/** Un solo GET con todo: la vista deriva absolutamente todo de estas listas,
 *  así que partirlo en endpoints por pantalla solo agregaría viajes de red. */
app.get('/api/state', async (req) => {
  const u = quien(req);
  return {
    cars: (selCars.all(u.id) as CarRow[]).map(carToJson),
    movs: (selMovs.all(u.id) as MovRow[]).map((m) => movToJson(m, selItems.all(m.id) as GastoItemRow[])),
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
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL,
      model: process.env.OPENROUTER_MODEL,
      signal: controller.signal,
      generateReport: (request) => createAssistantReport(u.id, request),
      queryFleet: (request) => Promise.resolve(queryFleetData(u.id, request)),
    });
  } catch (error) {
    req.log.warn({ error }, 'falló la consulta a OpenRouter');
    return unavailableAssistantReply(snapshot, error instanceof Error ? error.message : undefined);
  } finally {
    clearTimeout(timeout);
    assistantInFlight.delete(u.id);
  }
});

app.get<{ Params: { id: string } }>('/api/assistant/files/:id', async (req, reply) => {
  const file = assistantReportFiles.get(req.params.id);
  if (!file || file.expiresAt <= Date.now() || !existsSync(file.path)) return reply.code(404).send({ error: 'El archivo ya no está disponible' });
  reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  return reply.type(file.mimeType).send(createReadStream(file.path));
});

/** Ultimas posiciones conocidas, separadas del estado historico para que el
 * panel pueda refrescar el mapa sin descargar todos los movimientos. */
app.post<{ Body: FleetReportExportBody }>('/api/reports/export', async (req, reply) => {
  const u = quien(req);
  try {
    return await createFleetReport(u.id, req.body ?? {});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar el reporte';
    return reply.code(message.startsWith('No hay datos') ? 422 : 400).send({ error: message });
  }
});

app.get<{ Params: { id: string } }>('/api/reports/files/:id', async (req, reply) => {
  const file = assistantReportFiles.get(req.params.id);
  if (!file || file.expiresAt <= Date.now() || !existsSync(file.path)) return reply.code(404).send({ error: 'El archivo ya no está disponible' });
  reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  return reply.type(file.mimeType).send(createReadStream(file.path));
});

app.get('/api/locations', async (req) => {
  const u = quien(req);
  return (selLocations.all(u.id) as LocationRow[]).map(locationToJson);
});

const ESTADOS = new Set(['activo', 'taller', 'baja']);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
/** Tope de meses entre renovaciones de la póliza. Igual al del cliente. */
const SEG_CADA_MAX = 120;

interface CarPatch {
  plate?: string;
  model?: string;
  year?: number;
  driver?: string;
  cuota?: number;
  estado?: string;
  gpsTag?: string;
  kilometraje?: number;
  seguroNombre?: string;
  serviceCada?: number;
  serviceUnidad?: string;
  lastServiceDate?: string;
  seguroDate?: string;
  seguroCada?: number;
}

/** Mapea los campos que el cliente puede tocar a su columna, validando cada uno.
 *  `driver` y `cuota` se manejan aparte (la asignación de chofer ahora enlaza
 *  una fila de `drivers`, no solo un texto). */
const CAMPOS: Record<string, { col: string; ok: (v: unknown) => boolean }> = {
  plate: { col: 'plate', ok: (v) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 20 },
  model: { col: 'model', ok: (v) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 120 },
  year: { col: 'year', ok: (v) => Number.isInteger(v) && (v as number) > 1950 && (v as number) < 2100 },
  estado: { col: 'estado', ok: (v) => typeof v === 'string' && ESTADOS.has(v) },
  gpsTag: { col: 'gps_tag', ok: (v) => typeof v === 'string' && v.length <= 40 },
  kilometraje: { col: 'kilometraje', ok: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10_000_000 },
  seguroNombre: { col: 'seguro_nombre', ok: (v) => typeof v === 'string' && v.trim().length <= 120 },
  serviceCada: { col: 'service_cada', ok: (v) => v === 0 || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 3650) },
  serviceUnidad: { col: 'service_unidad', ok: (v) => v === 'dias' || v === 'meses' },
  lastServiceDate: { col: 'last_service_date', ok: (v) => v === '' || (typeof v === 'string' && FECHA.test(v)) },
  seguroDate: { col: 'seguro_date', ok: (v) => v === '' || (typeof v === 'string' && FECHA.test(v)) },
  seguroCada: { col: 'seguro_cada', ok: (v) => v === 0 || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= SEG_CADA_MAX) },
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

  const body = req.body ?? ({} as CarPatch);
  if (body.kilometraje !== undefined && (typeof body.kilometraje !== 'number' || body.kilometraje < actual.kilometraje)) return reply.code(400).send({ error: 'El kilometraje no puede disminuir' });
  const normalizedPlate = body.plate === undefined ? undefined : body.plate.trim().toUpperCase();
  if (normalizedPlate !== undefined) {
    const duplicate = db.prepare('SELECT 1 FROM cars WHERE owner_id = ? AND id <> ? AND UPPER(plate) = ?').get(u.id, req.params.id, normalizedPlate);
    if (duplicate) return reply.code(409).send({ error: 'Ya existe un vehículo con esa chapa' });
  }

  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [campo, def] of Object.entries(CAMPOS) as [string, { col: string; ok: (v: unknown) => boolean }][]) {
    const v = campo === 'plate' ? normalizedPlate : body[campo as keyof CarPatch];
    if (v === undefined) continue;
    if (!def.ok(v)) return reply.code(400).send({ error: `Valor inválido para ${campo}` });
    sets.push(`${def.col} = ?`);
    vals.push(v);
  }

  // Sin chofer no hay cuota. Se resuelve acá y no solo en el cliente para que
  // la regla valga también para cualquier otra vía de escritura.
  const driverFinal = body.driver ?? actual.driver;
  const cuotaFinal = body.cuota ?? actual.cuota;
  if (driverFinal === 'Sin chofer' && cuotaFinal > 0) {
    if (body.cuota !== undefined && body.driver === undefined) {
      return reply.code(400).send({ error: 'No se puede fijar una cuota en un vehículo sin chofer' });
    }
    sets.push('cuota = ?');
    vals.push(0);
  }

  // Quitar el chofer solo manda `driver`/`cuota`, que no viven en CAMPOS: con
  // sets vacío el UPDATE quedaría mal formado (`SET WHERE`). Ese caso se
  // resuelve abajo con aplicarDriverEnAuto, así que acá se saltea.
  if (sets.length) {
    if (body.kilometraje !== undefined) {
      sets.push('kilometraje_actualizado = ?');
      vals.push(hoyISO());
    }
    db.prepare(`UPDATE cars SET ${sets.join(', ')} WHERE id = ? AND owner_id = ?`).run(...vals, req.params.id, u.id);
  }

  // El chofer (y su cuota) se manejan enlazando la fila de drivers.
  if (body.driver !== undefined) {
    aplicarDriverEnAuto(db, u.id, req.params.id, body.driver === 'Sin chofer' ? null : body.driver, body.cuota ?? 0);
  } else if (body.cuota !== undefined) {
    db.prepare('UPDATE cars SET cuota = ? WHERE id = ? AND owner_id = ?').run(body.cuota, req.params.id, u.id);
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
    await borrarComprobante(a.comprobante).catch((e) => req.log.warn({ e, id: a.comprobante }, 'no se pudo borrar el comprobante'));
  }
  req.log.info({ car: car.plate, movs: n }, 'vehículo eliminado');
  return { ok: true, plate: car.plate, movs: n };
});

interface NuevoCar {
  plate: string;
  model: string;
  year: number;
  gpsTag?: string;
  kilometraje?: number;
  seguroNombre?: string;
  lastServiceDate?: string;
  serviceCada?: number;
  serviceUnidad?: string;
  seguroDate?: string;
  seguroCada?: number;
}

app.post<{ Body: NuevoCar }>('/api/cars', async (req, reply) => {
  const u = quien(req);
  const b = req.body ?? ({} as NuevoCar);
  const plate = String(b.plate ?? '').trim().toUpperCase();
  const model = String(b.model ?? '').trim();
  if (!plate) return reply.code(400).send({ error: 'La chapa es obligatoria' });
  if (!model) return reply.code(400).send({ error: 'La marca y modelo son obligatorios' });
  const kilometraje = b.kilometraje == null ? 0 : Number(b.kilometraje);
  if (!Number.isInteger(kilometraje) || kilometraje < 0 || kilometraje > 10_000_000) return reply.code(400).send({ error: 'El kilometraje inicial no es válido' });
  const seguroNombre = String(b.seguroNombre ?? '').trim();
  if (seguroNombre.length > 120) return reply.code(400).send({ error: 'El nombre del seguro no es válido' });
  const serviceCada = b.serviceCada == null ? 0 : Number(b.serviceCada);
  if (!Number.isInteger(serviceCada) || serviceCada < 0 || serviceCada > 3650) return reply.code(400).send({ error: 'El intervalo de service no es válido' });
  const seguroCada = b.seguroCada == null ? 0 : Number(b.seguroCada);
  if (!Number.isInteger(seguroCada) || seguroCada < 0 || seguroCada > SEG_CADA_MAX) return reply.code(400).send({ error: 'El intervalo del seguro no es válido' });

  // La chapa es única dentro de la flota de cada uno, no de toda la base.
  const dup = db.prepare('SELECT id FROM cars WHERE UPPER(plate) = ? AND owner_id = ?').get(plate, u.id);
  if (dup) return reply.code(409).send({ error: 'Ya existe un vehículo con esa chapa' });

  const hoy = hoyISO();
  // El vencimiento del seguro lo trae el alta. Si faltara, un año desde hoy es
  // el único supuesto razonable, pero se acepta para no romper clientes viejos.
  if (b.seguroDate !== undefined && b.seguroDate !== '' && !(typeof b.seguroDate === 'string' && FECHA.test(b.seguroDate))) {
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
    kilometraje,
    kilometraje_actualizado: b.kilometraje == null ? null : hoy,
    service_cada: serviceCada,
    service_unidad: b.serviceUnidad === 'dias' ? 'dias' : 'meses',
    last_service_date: typeof b.lastServiceDate === 'string' && FECHA.test(b.lastServiceDate) && b.lastServiceDate <= hoy ? b.lastServiceDate : '',
    seguro_date: typeof b.seguroDate === 'string' && FECHA.test(b.seguroDate) ? b.seguroDate : '',
    seguro_nombre: seguroNombre,
    seguro_cada: seguroCada,
  };
  db.prepare(`
    INSERT INTO cars (id, owner_id, plate, model, year, driver, cuota, estado, gps_tag, kilometraje, kilometraje_actualizado, service_cada, service_unidad, last_service_date, seguro_date, seguro_nombre, seguro_cada)
    VALUES (@id, @owner_id, @plate, @model, @year, @driver, @cuota, @estado, @gps_tag, @kilometraje, @kilometraje_actualizado, @service_cada, @service_unidad, @last_service_date, @seguro_date, @seguro_nombre, @seguro_cada)
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

type ComprobantePendiente = ComprobanteInput;

const prepararComprobante = (data: Buffer, filename: string | undefined, mimetype: string, extension: string): ComprobantePendiente => ({
  data,
  nombre: String(filename || 'comprobante').slice(0, 120),
  tipo: mimetype,
  extension,
});

app.post<{ Params: { id: string } }>('/api/cars/:id/taller', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });

  let razon = '';
  let monto = 0;
  let archivoPendiente: ComprobantePendiente | null = null;

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
      archivoPendiente = prepararComprobante(buf, parte.filename, parte.mimetype, ext);
    }
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ error: 'El comprobante no puede pasar de 8 MB' });
    throw e;
  }

  if (!razon) return reply.code(400).send({ error: 'Indicá el motivo de la entrada a taller' });
  if (monto <= 0) return reply.code(400).send({ error: 'Indicá cuánto se gasta en el taller' });

  const archivo = archivoPendiente ? await guardarComprobante(archivoPendiente) : null;
  const hoy = hoyISO();
  let info;
  try {
    info = db
      .prepare(
        `INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado, comprobante, comprobante_nombre, comprobante_tipo)
         VALUES (?, ?, 'egreso', ?, ?, ?, 'Taller', NULL, ?, ?, ?)`,
      )
      .run(u.id, car.id, monto, hoy, razon, archivo?.id ?? null, archivo?.nombre ?? null, archivo?.tipo ?? null);

    db.prepare("UPDATE cars SET estado = 'taller' WHERE id = ? AND owner_id = ?").run(car.id, u.id);
  } catch (error) {
    if (archivo) await borrarComprobante(archivo.id).catch((cleanupError) => req.log.warn({ err: cleanupError, id: archivo.id }, 'no se pudo limpiar el comprobante fallido'));
    throw error;
  }
  req.log.info({ car: car.plate, monto, comprobante: !!archivo }, 'vehículo a taller');

  const mov = db.prepare('SELECT * FROM movs WHERE id = ?').get(info.lastInsertRowid) as MovRow;
  return reply.code(201).send({ car: carToJson(selCar.get(car.id, u.id) as CarRow), mov: movToJson(mov) });
});

/** Categorías válidas para un gasto suelto. Mismo set que `CATS` en el cliente. */
const CATS_EGRESO = new Set(['Repuestos', 'Service', 'Taller', 'Combustible', 'Seguro', 'Multas', 'Documentación', 'Otros']);

interface GastoItemInput {
  nombre?: unknown;
  cantidad?: unknown;
  costoUnitario?: unknown;
}

function normalizarGastoItems(raw: string): { nombre: string; cantidad: number; costoUnitario: number; subtotal: number }[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || '[]');
  } catch {
    throw new Error('El detalle de repuestos no es válido');
  }
  if (!Array.isArray(parsed) || parsed.length > 50) throw new Error('El gasto puede tener hasta 50 ítems');
  return parsed.map((item: GastoItemInput) => {
    const nombre = String(item?.nombre ?? '').trim().slice(0, 120);
    const cantidad = Number(item?.cantidad);
    const costoUnitario = Number(item?.costoUnitario);
    if (!nombre || !Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 1_000_000 || !Number.isInteger(costoUnitario) || costoUnitario <= 0 || costoUnitario > 1_000_000_000) {
      throw new Error('Cada ítem necesita nombre, cantidad y costo unitario válidos');
    }
    const subtotal = Math.round(cantidad * costoUnitario);
    if (!Number.isInteger(subtotal) || subtotal <= 0 || subtotal > 1_000_000_000) throw new Error('El subtotal de un ítem no es válido');
    return { nombre, cantidad, costoUnitario, subtotal };
  });
}

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
  let itemsRaw = '[]';
  let manoObra = 0;
  let archivoPendiente: ComprobantePendiente | null = null;

  try {
    for await (const parte of req.parts()) {
      if (parte.type === 'field') {
        if (parte.fieldname === 'razon') razon = String(parte.value).trim().slice(0, 120);
        if (parte.fieldname === 'monto') monto = Number(String(parte.value).replace(/\D/g, '')) || 0;
        if (parte.fieldname === 'cat') cat = String(parte.value);
        if (parte.fieldname === 'items') itemsRaw = String(parte.value);
        if (parte.fieldname === 'manoObra') manoObra = Number(String(parte.value).replace(/\D/g, '')) || 0;
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
      archivoPendiente = prepararComprobante(buf, parte.filename, parte.mimetype, ext);
    }
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ error: 'El comprobante no puede pasar de 8 MB' });
    throw e;
  }

  if (!razon) return reply.code(400).send({ error: 'Indicá de qué es el gasto' });
  if (!CATS_EGRESO.has(cat)) return reply.code(400).send({ error: 'Elegí una categoría válida' });
  if (!Number.isInteger(manoObra) || manoObra < 0 || manoObra > 1_000_000_000) return reply.code(400).send({ error: 'La mano de obra no es válida' });
  let items: { nombre: string; cantidad: number; costoUnitario: number; subtotal: number }[];
  try {
    items = normalizarGastoItems(itemsRaw);
  } catch (e) {
    return reply.code(400).send({ error: e instanceof Error ? e.message : 'Detalle de gasto inválido' });
  }
  const detalleTotal = items.reduce((sum, item) => sum + item.subtotal, 0) + manoObra;
  const total = items.length || manoObra > 0 ? detalleTotal : monto;
  if (monto > 0 && (items.length || manoObra > 0) && monto !== detalleTotal) return reply.code(400).send({ error: 'El total no coincide con los ítems y la mano de obra' });
  if (total <= 0 || total > 1_000_000_000) return reply.code(400).send({ error: 'Indicá cuánto se gastó' });
  const archivo = archivoPendiente ? await guardarComprobante(archivoPendiente) : null;
  const hoy = hoyISO();
  let info;
  try {
    info = db.transaction(() => {
    const created = db
      .prepare(
        `INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado, mano_obra, comprobante, comprobante_nombre, comprobante_tipo)
         VALUES (?, ?, 'egreso', ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      )
      .run(u.id, car.id, total, hoy, razon, cat, manoObra, archivo?.id ?? null, archivo?.nombre ?? null, archivo?.tipo ?? null);
    const insertItem = db.prepare('INSERT INTO gasto_items (mov_id, nombre, cantidad, costo_unitario, subtotal) VALUES (?, ?, ?, ?, ?)');
    for (const item of items) insertItem.run(created.lastInsertRowid, item.nombre, item.cantidad, item.costoUnitario, item.subtotal);
    return created;
    })();
  } catch (error) {
    if (archivo) await borrarComprobante(archivo.id).catch((cleanupError) => req.log.warn({ err: cleanupError, id: archivo.id }, 'no se pudo limpiar el comprobante fallido'));
    throw error;
  }

  req.log.info({ car: car.plate, cat, monto: total, items: items.length, comprobante: !!archivo }, 'gasto registrado');

  const mov = db.prepare('SELECT * FROM movs WHERE id = ?').get(info.lastInsertRowid) as MovRow;
  return reply.code(201).send({ mov: movToJson(mov, selItems.all(mov.id) as GastoItemRow[]) });
});

/** Registra un service y, si tuvo costo, su gasto asociado en una sola
 * operación. El archivo se escribe antes de la transacción porque SQLite no
 * puede esperar una escritura async; si algo falla, se elimina el archivo
 * recién creado para no dejar comprobantes huérfanos. */
app.post<{ Params: { id: string } }>('/api/cars/:id/service', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });

  let fecha = '';
  let descripcion = '';
  let kilometraje: number | undefined;
  let costo: number | undefined;
  let archivoPendiente: ComprobantePendiente | null = null;

  try {
    for await (const parte of req.parts()) {
      if (parte.type === 'field') {
        if (parte.fieldname === 'fecha') fecha = String(parte.value).trim();
        if (parte.fieldname === 'descripcion') descripcion = String(parte.value).trim().slice(0, 160);
        if (parte.fieldname === 'kilometraje') {
          const raw = String(parte.value).trim();
          kilometraje = raw === '' ? undefined : Number(raw.replace(/\D/g, ''));
        }
        if (parte.fieldname === 'costo') {
          const raw = String(parte.value).trim();
          costo = raw === '' ? undefined : Number(raw.replace(/\D/g, ''));
        }
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
      if (buf.length) archivoPendiente = prepararComprobante(buf, parte.filename, parte.mimetype, ext);
    }
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ error: 'El comprobante no puede pasar de 8 MB' });
    throw e;
  }

  const hoy = hoyISO();
  if (!FECHA.test(fecha) || fecha > hoy) return reply.code(400).send({ error: 'La fecha del service no es válida' });
  if (!descripcion) return reply.code(400).send({ error: 'Contá qué service se hizo' });
  if (kilometraje !== undefined && (!Number.isInteger(kilometraje) || kilometraje < car.kilometraje || kilometraje > 10_000_000)) {
    return reply.code(400).send({ error: 'El kilometraje no puede ser menor al actual' });
  }
  if (costo !== undefined && (!Number.isInteger(costo) || costo < 0 || costo > 1_000_000_000)) return reply.code(400).send({ error: 'El costo del service no es válido' });

  const archivo = archivoPendiente ? await guardarComprobante(archivoPendiente) : null;

  try {
    const info = db.transaction(() => {
      const updates = ['last_service_date = ?'];
      const values: unknown[] = [fecha];
      if (kilometraje !== undefined) {
        updates.push('kilometraje = ?', 'kilometraje_actualizado = ?');
        values.push(kilometraje, hoy);
      }
      db.prepare(`UPDATE cars SET ${updates.join(', ')} WHERE id = ? AND owner_id = ?`).run(...values, car.id, u.id);
      if (costo === undefined || costo === 0) return null;
      return db
        .prepare(
          `INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado, mano_obra, comprobante, comprobante_nombre, comprobante_tipo)
           VALUES (?, ?, 'egreso', ?, ?, ?, 'Service', NULL, 0, ?, ?, ?)`,
        )
        .run(u.id, car.id, costo, fecha, descripcion, archivo?.id ?? null, archivo?.nombre ?? null, archivo?.tipo ?? null);
    })();

    const actualizado = db.prepare('SELECT * FROM cars WHERE id = ? AND owner_id = ?').get(car.id, u.id) as CarRow;
    const mov = info ? (db.prepare('SELECT * FROM movs WHERE id = ?').get(info.lastInsertRowid) as MovRow) : undefined;
    req.log.info({ car: car.plate, costo: costo ?? 0, comprobante: !!archivo }, 'service registrado');
    return reply.code(201).send({ car: carToJson(actualizado), ...(mov ? { mov: movToJson(mov, []) } : {}) });
  } catch (error) {
    if (archivo) await borrarComprobante(archivo.id).catch((cleanupError) => req.log.warn({ err: cleanupError, id: archivo.id }, 'no se pudo limpiar el comprobante fallido'));
    throw error;
  }
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
  let data: Buffer | null;
  try {
    data = await leerComprobante(fila.comprobante);
  } catch (error) {
    req.log.error({ err: error, id: fila.comprobante }, 'no se pudo leer el comprobante');
    return reply.code(502).send({ error: 'No se pudo recuperar el comprobante' });
  }
  if (!data) return reply.code(404).send({ error: 'El archivo ya no está disponible' });

  return reply
    .type(tipo)
    .header('Content-Disposition', `inline; filename="${nombre}"`)
    .header('X-Content-Type-Options', 'nosniff')
    .header('Content-Security-Policy', "default-src 'none'; sandbox")
    .header('Cache-Control', 'private, max-age=3600')
    .send(data);
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

  const driverInput = String(b.driver ?? '').trim();
  // admin-mobile puede enviar la identidad estable del chofer al elegir un
  // auto. Las versiones anteriores enviaban el nombre, por eso aceptamos
  // ambas formas y normalizamos siempre a nombre + driver_id antes de guardar.
  const driverById = /^\d+$/.test(driverInput)
    ? (db.prepare('SELECT id, nombre FROM drivers WHERE owner_id = ? AND id = ?').get(u.id, Number(driverInput)) as { id: number; nombre: string } | undefined)
    : undefined;
  const driverByName = driverById ?? (db.prepare('SELECT id, nombre FROM drivers WHERE owner_id = ? AND nombre = ?').get(u.id, driverInput) as { id: number; nombre: string } | undefined);
  const driver = driverByName?.nombre ?? driverInput;
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

  const driverId = driverByName?.id ?? (db.prepare('SELECT id FROM drivers WHERE owner_id = ? AND nombre = ?').get(u.id, driver) as { id: number } | undefined)?.id ?? null;
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
    `SELECT d.id AS driver_id, d.nombre AS driver, d.driver_pass_hash, c.id AS car_id, c.cuota, c.plate, c.model, c.year, c.kilometraje, c.kilometraje_actualizado
       FROM drivers d
       JOIN cars c ON c.driver_id = d.id AND c.estado <> 'baja'
      WHERE d.driver_username = ?`,
  ).get(usuario) as
    | { driver_id: number; driver: string; driver_pass_hash: string | null; car_id: string; cuota: number; plate: string; model: string; year: number; kilometraje: number; kilometraje_actualizado: string | null }
    | undefined;

  const ok = fila?.driver_pass_hash ? await verifyPassword(password, fila.driver_pass_hash) : false;
  if (!ok) {
    registrarFallo(db, clave);
    registrarAuth(db, 'chofer_login_fallo', usuario || null, ctxAuth(req));
    return reply.code(401).send({ error: 'Usuario o contraseña incorrectos' });
  }

  limpiarFallos(db, clave);
  const { token } = crearSesionChofer(db, fila!.driver_id, ctxAuth(req));
  registrarAuth(db, 'chofer_login_ok', fila!.driver, { ...ctxAuth(req), detalle: `usuario=${usuario}` });
  return {
    token,
    driver: fila!.driver,
    cuota: fila!.cuota,
    kilometraje: fila!.kilometraje,
    kilometrajeActualizado: fila!.kilometraje_actualizado,
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

app.post<{ Body: { kilometraje?: number } }>('/api/chofer/kilometraje', async (req, reply) => {
  const s = quienChofer(db, req);
  if (!s) return reply.code(401).send({ error: 'Sesión requerida' });
  const kilometraje = Number(req.body?.kilometraje);
  if (!Number.isInteger(kilometraje) || kilometraje < 0 || kilometraje > 10_000_000) {
    return reply.code(400).send({ error: 'El kilometraje debe ser un número entero válido' });
  }
  const car = db.prepare('SELECT kilometraje FROM cars WHERE id = ? AND owner_id = ?').get(s.carId, s.ownerId) as { kilometraje: number } | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });
  if (kilometraje < car.kilometraje) return reply.code(400).send({ error: 'El kilometraje no puede ser menor al registrado' });
  const actualizado = hoyISO();
  db.prepare('UPDATE cars SET kilometraje = ?, kilometraje_actualizado = ? WHERE id = ? AND owner_id = ?').run(kilometraje, actualizado, s.carId, s.ownerId);
  db.prepare('DELETE FROM kilometraje_alertas WHERE owner_id = ? AND car_id = ?').run(s.ownerId, s.carId);
  return { ok: true, kilometraje, actualizado };
});

app.get('/api/chofer/me', async (req, reply) => {
  const s = quienChofer(db, req);
  if (!s) return reply.code(401).send({ error: 'Sesión requerida' });
  const car = db.prepare('SELECT plate, model, year, cuota, kilometraje, kilometraje_actualizado FROM cars WHERE id = ?').get(s.carId) as { plate: string; model: string; year: number; cuota: number; kilometraje: number; kilometraje_actualizado: string | null };
  return { driver: s.driver, cuota: car.cuota, kilometraje: car.kilometraje, kilometrajeActualizado: car.kilometraje_actualizado, car: { plate: car.plate, model: car.model, year: car.year } };
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
  const carActual = db.prepare('SELECT cuota, kilometraje, kilometraje_actualizado FROM cars WHERE id = ? AND owner_id = ?').get(s.carId, s.ownerId) as { cuota: number; kilometraje: number; kilometraje_actualizado: string | null } | undefined;
  const cuota = carActual?.cuota ?? 0;
  const cobradoDelMes = cargos.filter((m) => m.date.slice(0, 7) === hoy.slice(0, 7)).reduce((a, m) => a + (cobrado.get(m.id) ?? 0), 0);
  const diasPagados = cuota > 0 ? Math.floor(cobradoDelMes / cuota) : 0;
  const diasTranscurridos = Number(hoy.slice(8, 10));

  const kilometrajeVencido = diasEntreISO(carActual?.kilometraje_actualizado ?? null) > 7;
  return {
    estado,
    deuda,
    aFavor,
    cuota,
    atrasadoDesde,
    diasPagados,
    diasTranscurridos,
    cobradoMes: cobradoDelMes,
    kilometraje: carActual?.kilometraje ?? 0,
    kilometrajeActualizado: carActual?.kilometraje_actualizado ?? null,
    kilometrajeVencido,
  };
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
  let archivoPendiente: ComprobantePendiente | null = null;

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
      archivoPendiente = prepararComprobante(buf, parte.filename, parte.mimetype, ext);
    }
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ error: 'El comprobante no puede pasar de 8 MB' });
    throw e;
  }

  if (medio !== 'Transferencia') return reply.code(400).send({ error: 'Los pagos de chofer solo aceptan transferencia' });
  if (!archivoPendiente) return reply.code(400).send({ error: 'Adjuntá el comprobante de la transferencia' });
  if (monto <= 0 || monto > 1_000_000_000) return reply.code(400).send({ error: 'El monto tiene que ser un número mayor a cero' });

  const archivo = await guardarComprobante(archivoPendiente);
  const hoy = hoyISO();
  let info;
  try {
    info = db
      .prepare('INSERT INTO pagos (owner_id, car_id, driver, driver_id, fecha, monto, tipo, medio, comprobante, comprobante_nombre, comprobante_tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(s.ownerId, s.carId, s.driver, s.driverId, hoy, monto, 'pago', medio || null, archivo.id, archivo.nombre, archivo.tipo);
  } catch (error) {
    await borrarComprobante(archivo.id).catch((cleanupError) => req.log.warn({ err: cleanupError, id: archivo.id }, 'no se pudo limpiar el comprobante fallido'));
    throw error;
  }

  req.log.info({ driver: s.driver, monto, medio, comprobante: !!archivo }, 'pago de chofer registrado');
  const pagoCar = s.carId ? (db.prepare('SELECT plate FROM cars WHERE id = ? AND owner_id = ?').get(s.carId, s.ownerId) as { plate: string } | undefined) : undefined;
  void sendOwnerPush(db, s.ownerId, {
    title: 'Pago recibido',
    body: `${s.driver} registró un pago${pagoCar ? ` de ${pagoCar.plate}` : ''} por ₲ ${Math.round(monto).toLocaleString('es-PY')}.`,
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

let stopDailyAlertDigest = () => {};
const cerrar = (sig: string) => {
  app.log.info({ sig }, 'cerrando');
  stopDailyAlertDigest();
  app.close().then(() => {
    db.close();
    process.exit(0);
  });
};
process.on('SIGTERM', () => cerrar('SIGTERM'));
process.on('SIGINT', () => cerrar('SIGINT'));

await app.listen({ port: PORT, host: '0.0.0.0' });
stopDailyAlertDigest = startDailyAlertDigest(db, app.log, { timeZone: process.env.MIFLOTA_TIME_ZONE });
