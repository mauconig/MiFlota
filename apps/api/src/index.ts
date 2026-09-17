import Fastify, { type FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { CarRow, LocationHistoryRow, LocationRow, MovRow, PagoRow, ReporteRow } from './db.js';
import { DB_PATH, carToJson, ensureDriver, locationHistoryToJson, locationToJson, movToJson, openDb, pagoToJson, reporteToJson } from './db.js';
import { borrarComprobante, canonicalizarComprobanteId, ComprobanteInvalidoError, COMPROBANTES_STORAGE, guardarComprobante, leerComprobante, type ComprobanteInput } from './comprobantes.js';
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
import { answerAssistant, type AssistantFile, type AssistantHistoryItem, type AssistantReportRequest } from './assistant.js';
import { queryFleetData } from './assistantQuery.js';
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
const TILE_CACHE_DIR = process.env.MIFLOTA_TILE_CACHE ?? join(dirname(DB_PATH), 'map-tiles');
const TILE_USER_AGENT = process.env.MIFLOTA_TILE_USER_AGENT ?? 'MiFlota/1.0 (OpenStreetMap tile proxy; contacto del administrador)';
const TILE_TIMEOUT_MS = 8_000;
const TILE_MAX_BYTES = 2 * 1024 * 1024;
await mkdir(ASSISTANT_REPORTS_DIR, { recursive: true });
await mkdir(TILE_CACHE_DIR, { recursive: true });

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
  if (req.url.startsWith('/api/comprobantes/')) return;
  if (req.url.startsWith('/api/map/tiles/')) return;
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
const selCars = db.prepare(`
  SELECT c.*, d.driver_username, d.driver_pass_hash
    FROM cars c
    LEFT JOIN drivers d ON d.id = c.driver_id AND d.owner_id = c.owner_id
   WHERE c.owner_id = ?
   ORDER BY c.rowid
`);
interface SectionRow { id: number; name: string; position: number }
const selSections = db.prepare('SELECT id,name,position FROM sections WHERE owner_id=? ORDER BY position,id');
const selMovs = db.prepare('SELECT * FROM movs WHERE owner_id = ? ORDER BY date DESC, id DESC');
const selPagos = db.prepare('SELECT * FROM pagos WHERE owner_id = ? ORDER BY fecha DESC, id DESC');
const selReportes = db.prepare('SELECT * FROM reportes_falla WHERE owner_id = ? ORDER BY fecha DESC, id DESC');
const selCar = db.prepare(`
  SELECT c.*, d.driver_username, d.driver_pass_hash
    FROM cars c
    LEFT JOIN drivers d ON d.id = c.driver_id AND d.owner_id = c.owner_id
   WHERE c.id = ? AND c.owner_id = ?
`);
const selLocations = db.prepare(`
  SELECT l.*
    FROM driver_locations l
    JOIN cars c ON c.id = l.car_id
   WHERE c.owner_id = ?
   ORDER BY l.received_at DESC
`);
const selLocationHistory = db.prepare(`
  SELECT h.*
    FROM driver_location_history h
    JOIN cars c ON c.id = h.car_id
   WHERE h.car_id = ? AND c.owner_id = ?
   ORDER BY h.received_at DESC
   LIMIT ?
`);

/** El preHandler ya rechazó las peticiones sin sesión, así que acá siempre hay usuario. */
function isoOffset(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function reportRange(period: Exclude<AssistantReportRequest['period'], 'custom'>, to: string): string | null {
  if (period === 'week') return isoOffset(to, -6);
  if (period === 'month') return `${to.slice(0, 7)}-01`;
  return null;
}

function validReportDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

function assistantReportRange(request: AssistantReportRequest, today: string): { from: string | null; to: string } {
  if (request.period !== 'custom') return { from: reportRange(request.period, today), to: today };
  if (!validReportDate(request.from) || !validReportDate(request.to) || request.from > request.to || request.to > today) throw Error('Período personalizado inválido');
  return { from: request.from, to: request.to };
}

function reportMoney(value: number): string {
  // Helvetica no contiene correctamente el símbolo ₲ y PDFKit lo termina
  // mostrando como un carácter extraño. "Gs." es claro y seguro en cualquier
  // visor de PDF, incluido el visor de Chrome en Android.
  return 'Gs. ' + new Intl.NumberFormat('es-PY').format(Math.round(value));
}

const REPORT_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** Rango legible. Si las fechas coinciden con una quincena, la nombra. */
function reportPeriodLabel(from: string, to: string): string {
  const day = (iso: string) => iso.slice(8, 10);
  const month = (iso: string) => iso.slice(5, 7);
  const range = `${day(from)}/${month(from)} al ${day(to)}/${month(to)}/${to.slice(0, 4)}`;
  if (from.slice(0, 7) !== to.slice(0, 7)) return range;
  const year = to.slice(0, 4);
  const monthNumber = Number(month(to));
  const lastDay = String(new Date(Date.UTC(Number(year), monthNumber, 0)).getUTCDate()).padStart(2, '0');
  const monthName = REPORT_MONTHS[monthNumber - 1];
  if (day(from) === '01' && day(to) === '15') return `1ª quincena de ${monthName} ${year} · ${range}`;
  if (day(from) === '16' && day(to) === lastDay) return `2ª quincena de ${monthName} ${year} · ${range}`;
  return range;
}

const reportFilterNorm = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const reportCategoryMatches = (value: string, filter: string) => {
  const candidate = reportFilterNorm(value).replace(/[^a-z0-9]/g, '');
  const raw = reportFilterNorm(filter).replace(/[^a-z0-9]/g, '');
  const needle = raw.replace(/^gastos?(?:de)?/, '') || raw;
  return !!needle && (candidate.includes(needle) || needle.includes(candidate));
};

/** Categorías que el dueño cuenta como "gastos de talleres"; el resto del
 *  egreso va a "Otros gastos". Es el corte con el que arma su reporte quincenal.
 *  OJO: "Repuestos" queda afuera a propósito. Un trabajo de taller se carga como
 *  "Taller" (con los repuestos adentro como ítems y la mano de obra aparte),
 *  mientras que "Repuestos" se usa para compras y stock —por ejemplo el
 *  prorrateo de importación de los GPS—, que en su reporte va a
 *  "Otros gastos / Repuestos para stock", no a talleres. */
const REPORT_WORKSHOP_CATEGORIES = new Set(['taller', 'service']);
const reportCategoryKey = (value: string) => reportFilterNorm(value).replace(/[^a-z0-9]/g, '');

interface FleetReportVehicleRef { vehiculo: string; seccion: string; modelo: string; gpsTag: string }
interface FleetReportGroup<T> { name: string; total: number; vehicles: { label: string; total: number; rows: T[] }[] }

/** Rótulo del vehículo en el PDF: SECCIÓN - TAG GPS - CHAPA, todo en mayúsculas.
 *  El `gps_tag` de esta flota guarda el color y la letra que distingue dos autos
 *  iguales ("Gris B") y es opcional: si no está cargado, no deja separador suelto. */
function reportVehicleLabel(row: FleetReportVehicleRef): string {
  const parts = [row.seccion?.trim() || 'Sin sección', row.gpsTag, row.vehiculo].map((part) => String(part ?? '').trim()).filter(Boolean);
  return parts.join(' - ').toUpperCase() || 'Vehículo eliminado';
}

/** Agrupa por sección y, dentro de cada sección, por vehículo. */
function groupReportRows<T extends FleetReportVehicleRef>(rows: T[], amountOf: (row: T) => number, sectionOrder: string[]): FleetReportGroup<T>[] {
  const order = new Map(sectionOrder.map((name, index) => [name.trim().toLowerCase(), index]));
  const bySection = new Map<string, Map<string, T[]>>();
  for (const row of rows) {
    const section = row.seccion?.trim() || 'Sin sección';
    const vehicles = bySection.get(section) ?? new Map<string, T[]>();
    const label = reportVehicleLabel(row);
    vehicles.set(label, [...(vehicles.get(label) ?? []), row]);
    bySection.set(section, vehicles);
  }
  // Las secciones respetan el orden del panel; lo que no está definido va al final.
  const rank = (name: string) => order.get(name.trim().toLowerCase()) ?? (name === 'Sin sección' ? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER - 1);
  return [...bySection.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], 'es'))
    .map(([name, vehicles]) => {
      const list = [...vehicles.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'es'))
        .map(([label, vehicleRows]) => ({ label, rows: vehicleRows, total: vehicleRows.reduce((sum, row) => sum + amountOf(row), 0) }));
      return { name, vehicles: list, total: list.reduce((sum, vehicle) => sum + vehicle.total, 0) };
    });
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
  const { from, to } = assistantReportRange(request, hoyISO());
  const cars = selCars.all(ownerId) as CarRow[];
  const carById = new Map(cars.map((car) => [car.id, car]));
  const sections = selSections.all(ownerId) as SectionRow[];
  const sectionById = new Map(sections.map((section) => [section.id, section.name]));
  const movements = (selMovs.all(ownerId) as MovRow[]).filter((mov) => {
    if (mov.type !== 'egreso' || mov.date > to || (from && mov.date < from)) return false;
    const car = carById.get(mov.car_id);
    if (request.vehicle && (!car || !reportFilterNorm(`${car.id} ${car.plate}`).includes(reportFilterNorm(request.vehicle)))) return false;
    if (request.category && !reportCategoryMatches(mov.cat ?? 'Otro', request.category)) return false;
    return true;
  });
  const rows = movements.map((mov) => {
    const car = carById.get(mov.car_id);
    return {
      fecha: mov.date,
      vehiculo: car?.plate ?? 'Vehículo eliminado',
      seccion: sectionById.get(car?.section_id ?? -1) ?? 'Sin sección',
      modelo: car?.model ?? '',
      gpsTag: car?.gps_tag ?? '',
      categoria: mov.cat ?? 'Otro',
      detalle: mov.descripcion,
      total: mov.amount,
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
        seccion: row.seccion,
        modelo: row.modelo,
        gpsTag: row.gpsTag,
        categoria: row.categoria,
        detalle: row.detalle,
        total: row.total,
      })),
      incomeTotal: 0,
      expenseTotal: rows.reduce((sum, row) => sum + row.total, 0),
      resultTotal: -rows.reduce((sum, row) => sum + row.total, 0),
      sectionOrder: sections.map((section) => section.name),
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
  /** Sección del vehículo: es el título con el que se agrupa en el PDF. */
  seccion: string;
  modelo: string;
  gpsTag: string;
  categoria: string;
  detalle: string;
  total: number;
}

interface FleetReportIncomeRow {
  fecha: string;
  vehiculo: string;
  seccion: string;
  modelo: string;
  gpsTag: string;
  chofer: string;
  monto: number;
  nota: string;
}

const REPORT_COLORS = {
  ink: '#16150f',
  muted: '#6b665c',
  blue: '#4a7fb5',
  navy: '#1f3d63',
  blueLight: '#dbe7f5',
  paper: '#fffdf8',
  line: '#f0ebe0',
  green: '#2e7d5b',
  red: '#c0553f',
};

async function pdfFromFleetReport(data: {
  periodLabel: string;
  generatedAt: string;
  incomeRows: FleetReportIncomeRow[];
  expenseRows: FleetReportExpenseRow[];
  incomeTotal: number;
  expenseTotal: number;
  resultTotal: number;
  sectionOrder: string[];
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

    /** Alto útil de una página después del encabezado negro: lo que se puede
     *  dibujar sin que `ensureSpace` dispare un salto. */
    const pageInner = doc.page.height - margin * 2 - 102;

    /** Lo que avanza una fila "concepto → monto" (ver `amountRow`). */
    const amountRowHeight = (label: string, indent: number, emphasis: 'normal' | 'bold' | 'muted' = 'normal') => {
      const font = emphasis === 'bold' ? 'Helvetica-Bold' : 'Helvetica';
      return doc.font(font).fontSize(9).heightOfString(label, { width: width - indent - 148 }) + 4;
    };

    /** Lo que avanza el rótulo de un vehículo (ver `vehicleHeader`). */
    const vehicleHeaderHeight = (label: string) => doc.font('Helvetica-Bold').fontSize(9).heightOfString(label, { width: width - 34 }) + 11;

    /** Lo que avanza una fila de subtotal (ver `totalRow`). */
    const totalRowHeight = (label: string, padAfter = 8) => amountRowHeight(label, 18, 'bold') + padAfter;

    /** Alto del bloque de un auto — rótulo, filas y "Total del auto" — para que
     *  no quede partido entre dos páginas. `padTotal` es el `padAfter` del total. */
    const vehicleBlockHeight = (label: string, rows: { detalle: string }[], padTotal = 10) =>
      vehicleHeaderHeight(label) + rows.reduce((sum, row) => sum + amountRowHeight(row.detalle, 30), 0) + amountRowHeight('Total del auto', 18, 'bold') + padTotal;

    /** Cuánto tiene que acompañar una barra o un título al bloque que viene
     *  abajo: el bloque completo si entra en una página, o al menos el rótulo y
     *  la primera fila cuando el auto tiene más gastos de los que entran. */
    const keepWithBlock = (vehicle: { label: string; rows: { detalle: string }[] } | undefined, prefix = 0) => {
      if (!vehicle) return 0;
      const minBlock = vehicleHeaderHeight(vehicle.label) + (vehicle.rows[0] ? amountRowHeight(vehicle.rows[0].detalle, 30) : 0);
      const block = vehicleBlockHeight(vehicle.label, vehicle.rows);
      return Math.max(0, Math.min(block <= pageInner ? block : minBlock, pageInner - prefix));
    };

    /** Fila "concepto → monto": el monto siempre alineado a la derecha. */
    const amountRow = (label: string, amount: number, indent: number, emphasis: 'normal' | 'bold' | 'muted' = 'normal') => {
      const font = emphasis === 'bold' ? 'Helvetica-Bold' : 'Helvetica';
      const textWidth = width - indent - 148;
      const height = doc.font(font).fontSize(9).heightOfString(label, { width: textWidth });
      ensureSpace(height + 5);
      const y = doc.y;
      doc.fillColor(emphasis === 'muted' ? REPORT_COLORS.muted : REPORT_COLORS.ink).font(font).fontSize(9).text(label, margin + indent, y, { width: textWidth });
      doc.fillColor(REPORT_COLORS.ink).font(font).fontSize(9).text(reportMoney(amount), margin + width - 144, y, { width: 138, align: 'right', lineBreak: false });
      doc.y = y + height + 4;
    };

    /** Barra del bloque principal: GASTOS DE TALLERES, OTROS GASTOS, COBROS.
     *  `keepWith` es el alto del bloque que viene abajo: la barra no puede quedar
     *  sola al pie de una página mientras su contenido sigue en la otra. */
    const blockHeader = (title: string, color: string, keepWith = 0) => {
      ensureSpace(48 + keepWith);
      const y = doc.y;
      doc.roundedRect(margin, y, width, 30, 8).fill(color);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text(title, margin + 12, y + 9, { width: width - 24, lineBreak: false });
      doc.y = y + 42;
    };

    /** Vehículo dentro de una sección: SECCIÓN - TAG GPS - CHAPA (ver reportVehicleLabel). */
    const vehicleHeader = (label: string) => {
      const height = vehicleHeaderHeight(label);
      ensureSpace(height + 3);
      doc.fillColor(REPORT_COLORS.ink).font('Helvetica-Bold').fontSize(9).text(label, margin + 18, doc.y + 5, { width: width - 34 });
      doc.y += height;
    };

    /** Subtotal de un auto o de un bloque. */
    const totalRow = (label: string, amount: number, padAfter = 8) => {
      amountRow(label, amount, 18, 'bold');
      doc.y += padAfter;
    };

    const sectionOf = (row: FleetReportVehicleRef) => row.seccion?.trim() || 'Sin sección';
    const isWorkshop = (row: FleetReportExpenseRow) => REPORT_WORKSHOP_CATEGORIES.has(reportCategoryKey(row.categoria));
    const sumExpenses = (rows: FleetReportExpenseRow[]) => rows.reduce((sum, row) => sum + row.total, 0);
    const sumIncome = (rows: FleetReportIncomeRow[]) => rows.reduce((sum, row) => sum + row.monto, 0);

    // Orden de secciones: el del panel y, al final, "Sin sección".
    const sectionRankOrder = new Map(data.sectionOrder.map((name, index) => [name.trim().toLowerCase(), index]));
    const sectionRank = (name: string) => sectionRankOrder.get(name.trim().toLowerCase()) ?? (name === 'Sin sección' ? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER - 1);
    const orderedSections = (rows: FleetReportVehicleRef[]) => [...new Set(rows.map(sectionOf))]
      .sort((a, b) => sectionRank(a) - sectionRank(b) || a.localeCompare(b, 'es'));

    /** Vehículos de una sección (una sola sección entra acá), con su total. */
    const groupVehicles = <T extends FleetReportVehicleRef>(rows: T[], amountOf: (row: T) => number) => groupReportRows(rows, amountOf, data.sectionOrder)[0]?.vehicles ?? [];

    /** Título grande que abre la página de cada sección. */
    const sectionBanner = (name: string) => {
      ensureSpace(44);
      const y = doc.y;
      doc.roundedRect(margin, y, width, 30, 8).fill(REPORT_COLORS.navy);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13).text(name.toUpperCase(), margin + 12, y + 8, { width: width - 24, lineBreak: false });
      doc.y = y + 40;
    };

    /** El primer auto de una lista, para saber cuánto tiene que acompañar la barra. */
    const firstVehicleBlock = (rows: FleetReportExpenseRow[]) => groupVehicles(rows, (row) => row.total)[0];

    /** Bloques de autos de una sección. `closingHeight` es el alto de los totales
     *  que vienen después: el último auto se lleva el cierre con él. */
    const renderExpenseVehicles = (rows: FleetReportExpenseRow[], closingHeight = 0) => {
      const vehicles = groupVehicles(rows, (row) => row.total);
      vehicles.forEach((vehicle, index) => {
        const isLast = index === vehicles.length - 1;
        const blockHeight = vehicleBlockHeight(vehicle.label, vehicle.rows) + (isLast ? closingHeight : 0);
        if (blockHeight <= pageInner) {
          ensureSpace(blockHeight);
        } else {
          // El auto tiene más gastos de los que entran en una página: al menos
          // el rótulo viaja con su primera fila.
          const firstRow = vehicle.rows[0];
          ensureSpace(vehicleHeaderHeight(vehicle.label) + (firstRow ? amountRowHeight(firstRow.detalle, 30) : 0));
        }
        vehicleHeader(vehicle.label);
        for (const row of vehicle.rows) {
          amountRow(row.detalle, row.total, 30);
        }
        totalRow('Total del auto', vehicle.total, 10);
      });
    };

    pageHeader();
    // ---- gastos: una página por sección ----
    const expenseSections = orderedSections(data.expenseRows);
    if (!expenseSections.length && !data.incomeRows.length) {
      pageHeader();
      doc.roundedRect(margin, doc.y, width, 60, 10).fill(REPORT_COLORS.blueLight);
      doc.fillColor(REPORT_COLORS.muted).font('Helvetica-Bold').fontSize(11).text('No hay datos para los filtros elegidos.', margin + 16, doc.y + 23);
      doc.end();
      return;
    }

    expenseSections.forEach((section, index) => {
      const rows = data.expenseRows.filter((row) => sectionOf(row) === section);
      const taller = rows.filter(isWorkshop);
      const otros = rows.filter((row) => !isWorkshop(row));
      if (index > 0) doc.addPage();
      pageHeader();
      sectionBanner(section);
      // `TOTAL GASTOS · SECCIÓN` cierra la sección: viaja con el último bloque
      // de autos para que no arranque sola la página siguiente.
      const sectionTotalHeight = totalRowHeight(`TOTAL GASTOS · ${section.toUpperCase()}`, 10);
      if (taller.length) {
        blockHeader('GASTOS DE TALLERES', REPORT_COLORS.ink, keepWithBlock(firstVehicleBlock(taller), 48));
        renderExpenseVehicles(taller, totalRowHeight('TOTAL TALLERES', 18) + (otros.length ? 0 : sectionTotalHeight));
        totalRow('TOTAL TALLERES', sumExpenses(taller), 18);
      }
      if (otros.length) {
        blockHeader('OTROS GASTOS', REPORT_COLORS.blue, keepWithBlock(firstVehicleBlock(otros), 48));
        renderExpenseVehicles(otros, totalRowHeight('TOTAL OTROS GASTOS', 18) + sectionTotalHeight);
        totalRow('TOTAL OTROS GASTOS', sumExpenses(otros), 18);
      }
      ensureSpace(sectionTotalHeight);
      totalRow(`TOTAL GASTOS · ${section.toUpperCase()}`, sumExpenses(rows), 10);
    });

    // ---- cobros: apartado único, resumido por sección y por vehículo ----
    if (data.incomeRows.length) {
      doc.addPage();
      pageHeader();
      sectionBanner('Cobros');
      for (const section of orderedSections(data.incomeRows)) {
        const rows = data.incomeRows.filter((row) => sectionOf(row) === section);
        const vehicles = groupVehicles(rows, (row) => row.monto);
        const incomeLabel = (vehicle: { label: string; rows: unknown[] }) => `${vehicle.label} · ${vehicle.rows.length} cobro${vehicle.rows.length === 1 ? '' : 's'}`;
        const first = vehicles[0];
        // El título de la sección no puede quedar solo al pie: se lleva su
        // primera fila (y el subtotal, si la sección es de un solo auto).
        ensureSpace(34 + (first ? amountRowHeight(incomeLabel(first), 20) : 0));
        const sectionY = doc.y;
        doc.fillColor(REPORT_COLORS.ink).font('Helvetica-Bold').fontSize(10).text(section, margin + 8, sectionY, { width: width - 16, lineBreak: false });
        doc.moveTo(margin + 8, sectionY + 16).lineTo(margin + width, sectionY + 16).lineWidth(0.7).strokeColor(REPORT_COLORS.line).stroke();
        doc.y = sectionY + 24;
        for (const vehicle of vehicles) {
          amountRow(incomeLabel(vehicle), vehicle.total, 20);
        }
        ensureSpace(totalRowHeight('Subtotal de la sección', 16));
        totalRow('Subtotal de la sección', sumIncome(rows), 16);
      }
      ensureSpace(totalRowHeight('TOTAL COBROS', 10));
      totalRow('TOTAL COBROS', data.incomeTotal, 10);
    }

    // ---- resumen final: los totales van abajo de todo ----
    doc.addPage();
    pageHeader();
    sectionBanner('Resumen');

    const cardGap = 9;
    const cardWidth = (width - cardGap * 2) / 3;
    const summaryCards = [
      ['Cobrado', data.incomeTotal, REPORT_COLORS.green],
      ['Gastos', data.expenseTotal, REPORT_COLORS.red],
      ['Resultado', data.resultTotal, data.resultTotal < 0 ? REPORT_COLORS.red : REPORT_COLORS.green],
    ] as const;
    const summaryY = doc.y;
    summaryCards.forEach(([label, amount, color], index) => {
      const x = margin + index * (cardWidth + cardGap);
      doc.roundedRect(x, summaryY, cardWidth, 66, 10).fill(REPORT_COLORS.paper).stroke(REPORT_COLORS.line);
      doc.fillColor(REPORT_COLORS.muted).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), x + 12, summaryY + 12);
      doc.fillColor(color).font('Helvetica-Bold').fontSize(15).text(reportMoney(amount), x + 12, summaryY + 32, { width: cardWidth - 24, lineBreak: false });
    });
    doc.y = summaryY + 88;

    const showIncome = data.incomeRows.length > 0;
    const summarySections = orderedSections([...data.expenseRows, ...data.incomeRows]);
    const labelWidth = Math.round(width * (showIncome ? 0.34 : 0.44));
    const columnWidth = Math.round((width - labelWidth) / (showIncome ? 4 : 3));
    const columns = showIncome ? ['Talleres', 'Otros', 'Cobros', 'Neto'] : ['Talleres', 'Otros', 'Neto'];
    const totalsFor = (section: string) => {
      const expenses = data.expenseRows.filter((row) => sectionOf(row) === section);
      const incomes = data.incomeRows.filter((row) => sectionOf(row) === section);
      const taller = sumExpenses(expenses.filter(isWorkshop));
      const otros = sumExpenses(expenses.filter((row) => !isWorkshop(row)));
      const cobros = sumIncome(incomes);
      return showIncome
        ? [reportMoney(taller), reportMoney(otros), reportMoney(cobros), reportMoney(cobros - taller - otros)]
        : [reportMoney(taller), reportMoney(otros), reportMoney(-(taller + otros))];
    };

    const summaryRow = (label: string, cells: string[], bold: boolean) => {
      const height = 20;
      ensureSpace(height + 4);
      const y = doc.y;
      const font = bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(font).fontSize(9).fillColor(REPORT_COLORS.ink).text(label, margin + 8, y + 5, { width: labelWidth - 16, lineBreak: false });
      cells.forEach((cell, index) => {
        doc.font(font).fontSize(9).fillColor(REPORT_COLORS.ink).text(cell, margin + labelWidth + index * columnWidth, y + 5, { width: columnWidth - 8, align: 'right', lineBreak: false });
      });
      doc.moveTo(margin + 4, y + height).lineTo(margin + width, y + height).lineWidth(0.5).strokeColor(REPORT_COLORS.line).stroke();
      doc.y = y + height + 2;
    };

    // El encabezado de la tabla se lleva su primera fila para no quedar solo.
    ensureSpace(26 + 22);
    const tableHeadY = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(REPORT_COLORS.muted).text('SECCIÓN', margin + 8, tableHeadY + 4, { width: labelWidth - 16, lineBreak: false });
    columns.forEach((column, index) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(REPORT_COLORS.muted).text(column.toUpperCase(), margin + labelWidth + index * columnWidth, tableHeadY + 4, { width: columnWidth - 8, align: 'right', lineBreak: false });
    });
    doc.y = tableHeadY + 20;

    for (const section of summarySections) summaryRow(section, totalsFor(section), false);
    const tallerTotal = sumExpenses(data.expenseRows.filter(isWorkshop));
    const otrosTotal = sumExpenses(data.expenseRows.filter((row) => !isWorkshop(row)));
    summaryRow('TOTAL', showIncome
      ? [reportMoney(tallerTotal), reportMoney(otrosTotal), reportMoney(data.incomeTotal), reportMoney(data.resultTotal)]
      : [reportMoney(tallerTotal), reportMoney(otrosTotal), reportMoney(-data.expenseTotal)], true);

    doc.y += 14;
    doc.font('Helvetica').fontSize(9).fillColor(REPORT_COLORS.muted).text(`${data.incomeRows.length + data.expenseRows.length} movimientos incluidos · datos filtrados según la selección`, margin, doc.y);
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
  const sections = selSections.all(ownerId) as SectionRow[];
  const sectionById = new Map(sections.map((section) => [section.id, section.name]));
  // El PDF quincenal se agrupa por sección y rotula cada vehículo con la
  // sección, la etiqueta GPS (en esta flota guarda el color, "Gris B") y la chapa.
  const carSection = (carId: string | null) => sectionById.get(carById.get(carId ?? '')?.section_id ?? -1) ?? 'Sin sección';
  const carModel = (carId: string | null) => carById.get(carId ?? '')?.model ?? '';
  const carGpsTag = (carId: string | null) => carById.get(carId ?? '')?.gps_tag ?? '';
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
    .map((pago) => ({ fecha: pago.fecha, vehiculo: carById.get(pago.car_id ?? '')?.plate ?? 'Sin vehículo', seccion: carSection(pago.car_id), modelo: carModel(pago.car_id), gpsTag: carGpsTag(pago.car_id), chofer: pago.driver || 'Sin chofer', monto: pago.monto, nota: pago.nota || '' }));

  const expenseRows: FleetReportExpenseRow[] = include === 'ingresos' ? [] : (selMovs.all(ownerId) as MovRow[])
    .filter((mov) => mov.type === 'egreso' && mov.date >= range.from && mov.date <= range.to && carAllowed(mov.car_id) && categoryAllowed(mov.cat || 'Otros'))
    .filter((mov) => {
      const car = carById.get(mov.car_id);
      return matchesSearch(mov.descripcion, mov.cat || 'Otros', car?.plate, car?.model, car?.driver);
    })
    .map((mov) => {
      return { fecha: mov.date, vehiculo: carById.get(mov.car_id)?.plate ?? 'Vehículo eliminado', seccion: carSection(mov.car_id), modelo: carModel(mov.car_id), gpsTag: carGpsTag(mov.car_id), categoria: mov.cat || 'Otros', detalle: mov.descripcion, total: mov.amount };
    });

  const counts = { ingresos: incomeRows.length, gastos: expenseRows.length, total: incomeRows.length + expenseRows.length };
  if (!counts.total) throw new Error('No hay datos para los filtros elegidos');

  const incomeTotal = incomeRows.reduce((sum, row) => sum + row.monto, 0);
  const expenseTotal = expenseRows.reduce((sum, row) => sum + row.total, 0);
  const resultTotal = incomeTotal - expenseTotal;
  const periodLabel = reportPeriodLabel(range.from, range.to);
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
      sectionOrder: sections.map((section) => section.name),
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

interface TileParams { z: string; x: string; y: string }
const tileInFlight = new Map<string, Promise<Buffer>>();

async function cargarTile(z: number, x: number, y: number, cachePath: string): Promise<Buffer> {
  const cacheado = await readFile(cachePath).catch(() => null);
  if (cacheado) return cacheado;
  const key = `${z}/${x}/${y}`;
  const pendiente = tileInFlight.get(key);
  if (pendiente) return pendiente;
  const trabajo = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TILE_TIMEOUT_MS);
    try {
      const upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
        signal: controller.signal,
        headers: { 'User-Agent': TILE_USER_AGENT, Referer: 'https://miflota.qd.je/' },
      });
      if (!upstream.ok) throw new Error(`OpenStreetMap respondió ${upstream.status}`);
      const contentType = upstream.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().startsWith('image/png')) throw new Error('Respuesta de mapa no vÃ¡lida');
      const declared = Number(upstream.headers.get('content-length') ?? 0);
      if (declared > TILE_MAX_BYTES) throw new Error('Tile demasiado grande');
      if (!upstream.body) throw new Error('Respuesta de mapa vacÃ­a');
      const reader = upstream.body.getReader();
      const chunks: Buffer[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > TILE_MAX_BYTES) {
          await reader.cancel().catch(() => {});
          throw new Error('Tile demasiado grande');
        }
        chunks.push(Buffer.from(value));
      }
      const bytes = Buffer.concat(chunks, total);
      await writeFile(cachePath, bytes);
      return bytes;
    } finally {
      clearTimeout(timeout);
    }
  })();
  tileInFlight.set(key, trabajo);
  try { return await trabajo; } finally { tileInFlight.delete(key); }
}

app.get<{ Params: TileParams }>('/api/map/tiles/:z/:x/:y.png', async (req, reply) => {
  const z = Number(req.params.z);
  const x = Number(req.params.x);
  const y = Number(req.params.y);
  const max = Number.isInteger(z) && z >= 0 && z <= 19 ? 2 ** z : 0;
  if (!max || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= max || y >= max) {
    return reply.code(400).send({ error: 'Tile inválido' });
  }
  const cachePath = join(TILE_CACHE_DIR, `${z}-${x}-${y}.png`);
  try {
    const bytes = await cargarTile(z, x, y, cachePath);
    return reply.header('Cache-Control', 'public, max-age=604800, immutable').type('image/png').send(bytes);
  } catch (error) {
    req.log.warn({ z, x, y, error: error instanceof Error ? error.message : String(error) }, 'map tile unavailable');
    return reply.code(502).send({ error: 'No se pudo cargar el mapa' });
  }
});

/** Un solo GET con todo: la vista deriva absolutamente todo de estas listas,
 *  así que partirlo en endpoints por pantalla solo agregaría viajes de red. */
app.get('/api/state', async (req) => {
  const u = quien(req);
  return {
    sections: selSections.all(u.id) as SectionRow[],
    cars: (selCars.all(u.id) as CarRow[]).map(carToJson),
    movs: (selMovs.all(u.id) as MovRow[]).map((m) => movToJson(m)),
    pagos: (selPagos.all(u.id) as PagoRow[]).map(pagoToJson),
    reportes: (selReportes.all(u.id) as ReporteRow[]).map(reporteToJson),
  };
});

const sectionName = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');
app.post<{ Body: { name?: string } }>('/api/sections', async (req, reply) => {
  const u = quien(req); const name = sectionName(req.body?.name);
  if (!name || name.length > 60) return reply.code(400).send({ error: 'Nombre de sección inválido' });
  if (db.prepare('SELECT 1 FROM sections WHERE owner_id=? AND lower(trim(name))=lower(?)').get(u.id, name)) return reply.code(409).send({ error: 'Ya existe una sección con ese nombre' });
  const position = (db.prepare('SELECT COALESCE(MAX(position),-1)+1 position FROM sections WHERE owner_id=?').get(u.id) as { position: number }).position;
  const result = db.prepare('INSERT INTO sections(owner_id,name,position) VALUES (?,?,?)').run(u.id, name, position);
  return reply.code(201).send({ id: Number(result.lastInsertRowid), name, position });
});
app.patch<{ Params: { id: string }; Body: { name?: string } }>('/api/sections/:id', async (req, reply) => {
  const u = quien(req); const id = Number(req.params.id); const name = sectionName(req.body?.name);
  if (!Number.isInteger(id) || !name || name.length > 60) return reply.code(400).send({ error: 'Sección inválida' });
  const result = db.prepare('UPDATE sections SET name=? WHERE id=? AND owner_id=?').run(name, id, u.id);
  if (!result.changes) return reply.code(404).send({ error: 'Sección inexistente' });
  return { id, name, position: (db.prepare('SELECT position FROM sections WHERE id=?').get(id) as { position: number }).position };
});
app.put<{ Body: { ids?: number[] } }>('/api/sections/order', async (req, reply) => {
  const u = quien(req); const ids = req.body?.ids;
  const current = (selSections.all(u.id) as SectionRow[]).map((s) => s.id);
  if (!Array.isArray(ids) || ids.length !== current.length || new Set(ids).size !== ids.length || ids.some((id) => !current.includes(id))) return reply.code(400).send({ error: 'Orden de secciones inválido' });
  db.transaction(() => ids.forEach((id, position) => db.prepare('UPDATE sections SET position=? WHERE id=? AND owner_id=?').run(position, id, u.id)))();
  return selSections.all(u.id);
});
app.delete<{ Params: { id: string } }>('/api/sections/:id', async (req, reply) => {
  const u = quien(req); const id = Number(req.params.id);
  const result = db.transaction(() => { db.prepare('UPDATE cars SET section_id=NULL WHERE owner_id=? AND section_id=?').run(u.id, id); return db.prepare('DELETE FROM sections WHERE id=? AND owner_id=?').run(id, u.id); })();
  if (!result.changes) return reply.code(404).send({ error: 'Sección inexistente' });
  return { ok: true };
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
  capabilities?: { lineCharts?: boolean };
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

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  assistantInFlight.add(u.id);
  try {
    return await answerAssistant(question, history, hoyISO(), {
      lineCharts: req.body?.capabilities?.lineCharts === true,
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL,
      model: process.env.OPENROUTER_MODEL,
      signal: controller.signal,
      generateReport: (request) => createAssistantReport(u.id, request),
      queryFleet: (request) => Promise.resolve(queryFleetData(db, u.id, request)),
    });
  } catch (error) {
    const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) };
    req.log.warn({ error: errorDetails }, 'falló la consulta a OpenRouter');
    return reply.code(controller.signal.aborted ? 504 : 502).send({ error: 'No pude completar la consulta. Volvé a intentar en un momento.' });
  } finally {
    clearTimeout(timeout);
    assistantInFlight.delete(u.id);
    req.log.info({ ownerId: u.id, elapsedMs: Date.now() - started }, 'assistant_finished');
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

app.get<{ Params: { carId: string }; Querystring: { limit?: string } }>('/api/locations/:carId/history', async (req, reply) => {
  const u = quien(req);
  const car = db.prepare('SELECT id FROM cars WHERE id = ? AND owner_id = ?').get(req.params.carId, u.id) as { id: string } | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });
  const requested = Number(req.query?.limit ?? 200);
  const limit = Number.isInteger(requested) ? Math.min(200, Math.max(1, requested)) : 200;
  return (selLocationHistory.all(car.id, u.id, limit) as LocationHistoryRow[]).map(locationHistoryToJson);
});

const ESTADOS = new Set(['activo', 'taller', 'baja']);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
/** Tope de meses entre renovaciones de la póliza. Igual al del cliente. */
const SEG_CADA_MAX = 120;

interface CarPatch {
  sectionId?: number | null;
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
  if (body.sectionId !== undefined) {
    if (body.sectionId !== null && (!Number.isInteger(body.sectionId) || !db.prepare('SELECT 1 FROM sections WHERE id=? AND owner_id=?').get(body.sectionId, u.id))) return reply.code(400).send({ error: 'Sección inválida' });
    db.prepare('UPDATE cars SET section_id=? WHERE id=? AND owner_id=?').run(body.sectionId, req.params.id, u.id);
  }
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

interface ActualizarChoferCredencialesBody {
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

/** Devuelve solo el nombre de usuario actual. La contraseña y su hash nunca
 * salen de la API: el dueño solo puede reemplazarlos, no recuperarlos. */
app.get<{ Params: { id: string } }>('/api/cars/:id/chofer-credenciales', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });
  if (!car.driver_id) return reply.code(400).send({ error: 'Asigná un chofer antes de administrar sus credenciales' });

  const driver = db.prepare('SELECT id, driver_username, driver_pass_hash FROM drivers WHERE id = ? AND owner_id = ?').get(car.driver_id, u.id) as
    | { id: number; driver_username: string | null; driver_pass_hash: string | null }
    | undefined;
  if (!driver) return reply.code(404).send({ error: 'Chofer inexistente' });
  return { username: driver.driver_username, hasPassword: Boolean(driver.driver_pass_hash) };
});

/** Actualiza el usuario y, si viene informado, la contraseña del chofer. El
 * usuario es global porque la app de chofer inicia sesión sin indicar flota. */
app.patch<{ Params: { id: string }; Body: ActualizarChoferCredencialesBody }>('/api/cars/:id/chofer-credenciales', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });
  if (!car.driver_id) return reply.code(400).send({ error: 'Asigná un chofer antes de administrar sus credenciales' });

  const driver = db.prepare('SELECT id, driver_username, driver_pass_hash FROM drivers WHERE id = ? AND owner_id = ?').get(car.driver_id, u.id) as
    | { id: number; driver_username: string | null; driver_pass_hash: string | null }
    | undefined;
  if (!driver) return reply.code(404).send({ error: 'Chofer inexistente' });

  const username = String(req.body?.username ?? '').trim().toLowerCase();
  const password = req.body?.password;
  if (!/^[a-z0-9.]{1,40}$/.test(username)) return reply.code(400).send({ error: 'Usuario de chofer inválido' });
  if (password !== undefined && (typeof password !== 'string' || password.length < 9 || password.length > 128)) {
    return reply.code(400).send({ error: 'La contraseña debe tener entre 9 y 128 caracteres' });
  }
  if (!driver.driver_username || !driver.driver_pass_hash) {
    if (password === undefined || password.length === 0) return reply.code(400).send({ error: 'La contraseña es obligatoria para crear el acceso del chofer' });
  }

  // El hash se calcula antes de escribir, como en el resto de las rutas de
  // autenticación. La condición NOT EXISTS evita que una carrera pueda pasar
  // por encima del índice único global de usuarios de chofer.
  const passHash = password === undefined ? undefined : await hashPassword(password);
  const sesiones = db.prepare('SELECT COUNT(*) AS n FROM chofer_sessions WHERE driver_id = ?').get(driver.id) as { n: number };
  const cambio = passHash === undefined
    ? db.prepare(`
        UPDATE drivers
           SET driver_username = ?
         WHERE id = ?
           AND NOT EXISTS (SELECT 1 FROM drivers WHERE driver_username = ? AND id <> ?)
      `).run(username, driver.id, username, driver.id)
    : db.prepare(`
        UPDATE drivers
           SET driver_username = ?, driver_pass_hash = ?
         WHERE id = ?
           AND NOT EXISTS (SELECT 1 FROM drivers WHERE driver_username = ? AND id <> ?)
      `).run(username, passHash, driver.id, username, driver.id);

  if (cambio.changes === 0) return reply.code(409).send({ error: 'Ese usuario ya está en uso' });
  borrarSesionesDeDriver(db, driver.id);
  req.log.info({ driver: car.driver, username }, 'credenciales de chofer actualizadas');
  return { username, sesionesCerradas: sesiones.n };
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
  sectionId: number;
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
  if (!Number.isInteger(b.sectionId) || !db.prepare('SELECT 1 FROM sections WHERE id=? AND owner_id=?').get(b.sectionId, u.id)) return reply.code(400).send({ error: 'La sección es obligatoria' });
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
    section_id: b.sectionId,
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
    INSERT INTO cars (id, owner_id, section_id, plate, model, year, driver, cuota, estado, gps_tag, kilometraje, kilometraje_actualizado, service_cada, service_unidad, last_service_date, seguro_date, seguro_nombre, seguro_cada)
    VALUES (@id, @owner_id, @section_id, @plate, @model, @year, @driver, @cuota, @estado, @gps_tag, @kilometraje, @kilometraje_actualizado, @service_cada, @service_unidad, @last_service_date, @seguro_date, @seguro_nombre, @seguro_cada)
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
  'image/heif': 'heic',
  'application/pdf': 'pdf',
};

type ComprobantePendiente = ComprobanteInput;

const prepararComprobante = (data: Buffer, filename: string | undefined, mimetype: string, extension: string): ComprobantePendiente => ({
  data,
  nombre: String(filename || 'comprobante').slice(0, 120),
  tipo: mimetype,
  extension,
});

type ComprobanteGuardado = Awaited<ReturnType<typeof guardarComprobante>>;
type GuardarComprobanteResultado = { ok: true; archivo: ComprobanteGuardado | null } | { ok: false };

async function guardarComprobanteParaRuta(pendiente: ComprobantePendiente, reply: FastifyReply): Promise<{ ok: true; archivo: ComprobanteGuardado }>;
async function guardarComprobanteParaRuta(pendiente: null, reply: FastifyReply): Promise<{ ok: true; archivo: null }>;
async function guardarComprobanteParaRuta(pendiente: ComprobantePendiente | null, reply: FastifyReply): Promise<GuardarComprobanteResultado>;
async function guardarComprobanteParaRuta(pendiente: ComprobantePendiente | null, reply: FastifyReply): Promise<GuardarComprobanteResultado> {
  if (!pendiente) return { ok: true, archivo: null };
  try {
    return { ok: true, archivo: await guardarComprobante(pendiente) };
  } catch (error) {
    if (error instanceof ComprobanteInvalidoError) {
      reply.code(415).send({ error: error.message });
      return { ok: false };
    }
    throw error;
  }
}

app.post<{ Params: { id: string } }>('/api/cars/:id/taller', async (req, reply) => {
  const u = quien(req);
  const car = selCar.get(req.params.id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });

  let razon = '';
  let monto = 0;
  let reportId: number | null = null;
  let archivoPendiente: ComprobantePendiente | null = null;

  try {
    for await (const parte of req.parts()) {
      if (parte.type === 'field') {
        if (parte.fieldname === 'razon') razon = String(parte.value).trim().slice(0, 120);
        if (parte.fieldname === 'monto') monto = Number(String(parte.value).replace(/\D/g, '')) || 0;
        if (parte.fieldname === 'reportId') {
          const value = Number(parte.value);
          reportId = Number.isInteger(value) && value > 0 ? value : null;
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

  const reporte = reportId
    ? (db.prepare('SELECT * FROM reportes_falla WHERE id = ? AND owner_id = ?').get(reportId, u.id) as ReporteRow | undefined)
    : undefined;
  if (reportId && !reporte) return reply.code(404).send({ error: 'Reporte inexistente' });
  if (reporte?.car_id !== undefined && reporte.car_id !== car.id) return reply.code(400).send({ error: 'El reporte no corresponde a este vehículo' });
  if (reporte?.estado === 'resuelta') return reply.code(409).send({ error: 'El reporte ya está resuelto' });

  // Vincular un reporte a un vehículo que ya está en taller no representa una
  // nueva entrada ni un gasto nuevo. Este atajo también protege contra dobles
  // envíos desde clientes desactualizados.
  if (reporte && car.estado === 'taller') {
    db.prepare("UPDATE reportes_falla SET estado = 'en_taller' WHERE id = ? AND owner_id = ?").run(reporte.id, u.id);
    const reporteActualizado = db.prepare('SELECT * FROM reportes_falla WHERE id = ? AND owner_id = ?').get(reporte.id, u.id) as ReporteRow;
    return reply.send({ car: carToJson(car), reporte: reporteToJson(reporteActualizado) });
  }

  if (!razon) return reply.code(400).send({ error: 'Indicá el motivo de la entrada a taller' });
  if (monto <= 0) return reply.code(400).send({ error: 'Indicá cuánto se gasta en el taller' });

  const guardado = await guardarComprobanteParaRuta(archivoPendiente, reply);
  if (!guardado.ok) return;
  const archivo = guardado.archivo;
  const hoy = hoyISO();
  let info;
  try {
    info = db.transaction(() => {
      const inserted = db
        .prepare(
          `INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado, comprobante, comprobante_nombre, comprobante_tipo)
           VALUES (?, ?, 'egreso', ?, ?, ?, 'Taller', NULL, ?, ?, ?)`,
        )
        .run(u.id, car.id, monto, hoy, razon, archivo?.id ?? null, archivo?.nombre ?? null, archivo?.tipo ?? null);
      db.prepare("UPDATE cars SET estado = 'taller' WHERE id = ? AND owner_id = ?").run(car.id, u.id);
      if (reporte) db.prepare("UPDATE reportes_falla SET estado = 'en_taller' WHERE id = ? AND owner_id = ?").run(reporte.id, u.id);
      return inserted;
    })();
  } catch (error) {
    if (archivo) await borrarComprobante(archivo.id).catch((cleanupError) => req.log.warn({ err: cleanupError, id: archivo.id }, 'no se pudo limpiar el comprobante fallido'));
    throw error;
  }
  req.log.info({ car: car.plate, monto, comprobante: !!archivo }, 'vehículo a taller');

  const mov = db.prepare('SELECT * FROM movs WHERE id = ?').get(info.lastInsertRowid) as MovRow;
  const reporteActualizado = reporte
    ? (db.prepare('SELECT * FROM reportes_falla WHERE id = ? AND owner_id = ?').get(reporte.id, u.id) as ReporteRow)
    : null;
  return reply.code(201).send({
    car: carToJson(selCar.get(car.id, u.id) as CarRow),
    mov: movToJson(mov),
    ...(reporteActualizado ? { reporte: reporteToJson(reporteActualizado) } : {}),
  });
});

/** Categorías válidas para un gasto suelto. Mismo set que `CATS` en el cliente. */
const CATS_EGRESO = new Set(['Repuestos', 'Service', 'Taller', 'Combustible', 'Seguro', 'Multas', 'Documentación', 'Otros']);

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
  let archivoPendiente: ComprobantePendiente | null = null;

  try {
    for await (const parte of req.parts()) {
      if (parte.type === 'field') {
        if (parte.fieldname === 'razon') razon = String(parte.value).trim().slice(0, 120);
        if (parte.fieldname === 'monto') monto = Number(String(parte.value).replace(/\D/g, '')) || 0;
        if (parte.fieldname === 'cat') cat = String(parte.value);
        // `items` y `manoObra` quedaron fuera del modelo: si un cliente viejo
        // todavía los manda, se ignoran.
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
  if (monto <= 0 || monto > 1_000_000_000) return reply.code(400).send({ error: 'Indicá cuánto se gastó' });
  const guardado = await guardarComprobanteParaRuta(archivoPendiente, reply);
  if (!guardado.ok) return;
  const archivo = guardado.archivo;
  const hoy = hoyISO();
  let info;
  try {
    info = db.transaction(() => {
    return db
      .prepare(
        `INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado, comprobante, comprobante_nombre, comprobante_tipo)
         VALUES (?, ?, 'egreso', ?, ?, ?, ?, NULL, ?, ?, ?)`,
      )
      .run(u.id, car.id, monto, hoy, razon, cat, archivo?.id ?? null, archivo?.nombre ?? null, archivo?.tipo ?? null);
    })();
  } catch (error) {
    if (archivo) await borrarComprobante(archivo.id).catch((cleanupError) => req.log.warn({ err: cleanupError, id: archivo.id }, 'no se pudo limpiar el comprobante fallido'));
    throw error;
  }

  req.log.info({ car: car.plate, cat, monto, comprobante: !!archivo }, 'gasto registrado');

  const mov = db.prepare('SELECT * FROM movs WHERE id = ?').get(info.lastInsertRowid) as MovRow;
  return reply.code(201).send({ mov: movToJson(mov) });
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

  const guardado = await guardarComprobanteParaRuta(archivoPendiente, reply);
  if (!guardado.ok) return;
  const archivo = guardado.archivo;

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
          `INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado, comprobante, comprobante_nombre, comprobante_tipo)
           VALUES (?, ?, 'egreso', ?, ?, ?, 'Service', NULL, ?, ?, ?)`,
        )
        .run(u.id, car.id, costo, fecha, descripcion, archivo?.id ?? null, archivo?.nombre ?? null, archivo?.tipo ?? null);
    })();

    const actualizado = db.prepare('SELECT * FROM cars WHERE id = ? AND owner_id = ?').get(car.id, u.id) as CarRow;
    const mov = info ? (db.prepare('SELECT * FROM movs WHERE id = ?').get(info.lastInsertRowid) as MovRow) : undefined;
    req.log.info({ car: car.plate, costo: costo ?? 0, comprobante: !!archivo }, 'service registrado');
    return reply.code(201).send({ car: carToJson(actualizado), ...(mov ? { mov: movToJson(mov) } : {}) });
  } catch (error) {
    if (archivo) await borrarComprobante(archivo.id).catch((cleanupError) => req.log.warn({ err: cleanupError, id: archivo.id }, 'no se pudo limpiar el comprobante fallido'));
    throw error;
  }
});

/** Descarga del comprobante. Se resuelve por el movimiento y no por el nombre
 *  del archivo, así que el id solo sirve si el movimiento es del que pregunta. */
app.get<{ Params: { id: string } }>('/api/comprobantes/:id', async (req, reply) => {
  type Fila = { comprobante: string; comprobante_nombre: string | null; comprobante_tipo: string | null };
  const owner = usuarioDeSesion(db, tokenDueno(req));
  const comprobanteId = canonicalizarComprobanteId(req.params.id);
  let fila: Fila | undefined;
  if (owner) {
    fila =
      (db.prepare('SELECT comprobante, comprobante_nombre, comprobante_tipo FROM movs WHERE comprobante = ? AND owner_id = ?').get(comprobanteId, owner.id) as Fila | undefined) ??
      (db.prepare('SELECT comprobante, comprobante_nombre, comprobante_tipo FROM pagos WHERE comprobante = ? AND owner_id = ?').get(comprobanteId, owner.id) as Fila | undefined);
  } else {
    const chofer = quienChofer(db, req);
    if (!chofer) return reply.code(401).send({ error: 'SesiÃ³n requerida' });
    fila = db
      .prepare(`SELECT comprobante, comprobante_nombre, comprobante_tipo
                 FROM pagos
                 WHERE comprobante = ? AND owner_id = ?
                   AND (driver_id = ? OR (driver_id IS NULL AND driver = ?))`)
      .get(comprobanteId, chofer.ownerId, chofer.driverId, chofer.driver) as Fila | undefined;
  }
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
  const accuracy = req.body?.accuracy == null ? Number.NaN : Number(req.body.accuracy);
  const recorded = new Date(String(req.body?.recordedAt ?? ''));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    req.log.warn({ carId: s.carId, reason: 'invalid_coordinates' }, 'driver location rejected');
    return reply.code(400).send({ error: 'Coordenadas inválidas' });
  }
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 50) {
    req.log.warn({ carId: s.carId, reason: 'invalid_accuracy' }, 'driver location rejected');
    return reply.code(400).send({ error: 'Precisión inválida' });
  }
  if (Number.isNaN(recorded.getTime())) {
    req.log.warn({ carId: s.carId, reason: 'invalid_recorded_at' }, 'driver location rejected');
    return reply.code(400).send({ error: 'Fecha de ubicación inválida' });
  }
  if (recorded.getTime() > Date.now() + 5 * 60_000) {
    req.log.warn({ carId: s.carId, reason: 'future_recorded_at' }, 'driver location rejected');
    return reply.code(400).send({ error: 'La ubicación no puede ser futura' });
  }

  // Android puede marcar una ubicación proveniente de un proveedor de mock.
  // No es una defensa contra un cliente modificado, pero evita aceptar el caso
  if (req.body?.mocked === true) req.log.warn({ carId: s.carId, reason: 'mocked_location' }, 'driver location rejected');
  // detectable sin impedir ubicaciones legítimas donde el campo no existe.
  if (req.body?.mocked === true) return reply.code(400).send({ error: 'La ubicación simulada no está permitida' });

  const recordedAt = recorded.toISOString();
  const receivedAt = new Date().toISOString();
  const info = db.transaction(() => {
    const upsert = db.prepare(`
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
        AND julianday(excluded.recorded_at) >= julianday('now', '-5 minutes')
    `).run(s.carId, latitude, longitude, accuracy, recordedAt, receivedAt);
    if (upsert.changes === 0) return upsert;
    db.prepare(`
      INSERT OR IGNORE INTO driver_location_history
        (car_id, latitude, longitude, accuracy, recorded_at, received_at, mocked)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(s.carId, latitude, longitude, accuracy, recordedAt, receivedAt);
    db.prepare("DELETE FROM driver_location_history WHERE received_at < datetime('now', '-30 days')").run();
    return upsert;
  })();

  if (info.changes === 0) req.log.warn({ carId: s.carId, reason: 'stale_recorded_at' }, 'driver location rejected');
  if (info.changes === 0) return reply.code(409).send({ ok: false, accepted: false, error: 'La ubicaciÃ³n estÃ¡ desactualizada' });
  req.log.info({ carId: s.carId, accuracy, recordedAt }, 'driver location received');
  return { ok: true, accepted: true, recordedAt, receivedAt };
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

  const hoy = hoyISO();
  const flota = db.prepare('SELECT id, driver, cuota FROM cars WHERE owner_id = ?').all(s.ownerId) as { id: string; driver: string; cuota: number }[];
  const driverDeCar = new Map(flota.map((c) => [c.id, c.driver]));
  // Todo lo que sigue es de un solo chofer; la clave de imputación es su id.
  const choferDe = () => s.driverId;
  const esEste = (m: MovRow) => (m.driver_id != null ? m.driver_id === s.driverId : (m.driver ?? driverDeCar.get(m.car_id)) === s.driver);

  const cargos = (db.prepare("SELECT * FROM movs WHERE owner_id = ? AND type = 'ingreso'").all(s.ownerId) as MovRow[]).filter((m) => m.date <= hoy && esEste(m));
  const pagos = (db.prepare('SELECT * FROM pagos WHERE owner_id = ?').all(s.ownerId) as PagoRow[]).filter((p) =>
    p.fecha <= hoy && (p.driver_id != null ? p.driver_id === s.driverId : p.driver === s.driver),
  );
  const { cobrado, saldoAFavor } = imputar(cargos, pagos, choferDe);

  const deuda = cargos.reduce((a, m) => a + (m.amount - (cobrado.get(m.id) ?? 0)), 0);
  const aFavor = saldoAFavor.get(String(s.driverId)) ?? 0;
  const estado = deuda > 0 ? 'atrasado' : aFavor > 0 ? 'adelantado' : 'al_dia';

  const pendientes = cargos
    .filter((m) => m.amount - (cobrado.get(m.id) ?? 0) > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  // No es una fecha de vencimiento futura (no existe ese concepto: los cargos
  // no se emiten solos, ver seed.ts) — es desde cuándo viene arrastrando la
  // cuota más vieja sin pagar.
  const atrasadoDesde = estado === 'atrasado' ? (pendientes[0]?.date ?? null) : null;

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

  const guardado = await guardarComprobanteParaRuta(archivoPendiente, reply);
  if (!guardado.ok) return;
  const archivo = guardado.archivo;
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
  const filas = selReportes.all(u.id) as ReporteRow[];
  return filas.map(reporteToJson);
});

app.patch<{ Params: { id: string }; Body: { estado?: string } }>('/api/reportes/:id', async (req, reply) => {
  const u = quien(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return reply.code(400).send({ error: 'Reporte inválido' });
  const reporte = db.prepare('SELECT * FROM reportes_falla WHERE id = ? AND owner_id = ?').get(id, u.id) as ReporteRow | undefined;
  if (!reporte) return reply.code(404).send({ error: 'Reporte inexistente' });

  const estado = req.body?.estado;
  if (estado !== 'en_taller' && estado !== 'resuelta') return reply.code(400).send({ error: 'Estado de reporte inválido' });
  if (reporte.estado === 'resuelta' && estado !== 'resuelta') return reply.code(409).send({ error: 'El reporte ya está resuelto' });
  const car = selCar.get(reporte.car_id, u.id) as CarRow | undefined;
  if (!car) return reply.code(404).send({ error: 'Vehículo inexistente' });
  if (estado === 'en_taller') {
    if (car.estado !== 'taller') return reply.code(409).send({ error: 'Primero tenés que enviar el vehículo al taller' });
  }

  db.prepare('UPDATE reportes_falla SET estado = ? WHERE id = ? AND owner_id = ?').run(estado, reporte.id, u.id);
  const actualizado = db.prepare('SELECT * FROM reportes_falla WHERE id = ? AND owner_id = ?').get(reporte.id, u.id) as ReporteRow;
  req.log.info({ reportId: reporte.id, estado }, 'estado de reporte actualizado');
  return reporteToJson(actualizado);
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
