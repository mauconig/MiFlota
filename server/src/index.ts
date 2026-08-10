import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { CarRow, MovRow } from './db.js';
import { DB_PATH, carToJson, movToJson, openDb, seedIfEmpty } from './db.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = process.env.MIFLOTA_PUBLIC ?? join(HERE, '..', 'public');
const PORT = Number(process.env.PORT ?? 3000);

const db = openDb();
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

const sembrada = seedIfEmpty(db);
app.log.info({ db: DB_PATH, sembrada }, sembrada ? 'base vacía: flota de demostración sembrada' : 'base existente reutilizada');

/* ------------------------------- API ------------------------------- */

const selCars = db.prepare('SELECT * FROM cars ORDER BY rowid');
const selMovs = db.prepare('SELECT * FROM movs ORDER BY date DESC, id DESC');
const selCar = db.prepare('SELECT * FROM cars WHERE id = ?');

app.get('/api/health', async () => ({ ok: true, db: DB_PATH }));

/** Un solo GET con todo: la vista deriva absolutamente todo de estas dos listas,
 *  así que partirlo en endpoints por pantalla solo agregaría viajes de red. */
app.get('/api/state', async () => ({
  cars: (selCars.all() as CarRow[]).map(carToJson),
  movs: (selMovs.all() as MovRow[]).map(movToJson),
}));

const ESTADOS = new Set(['activo', 'taller', 'baja']);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

interface CarPatch {
  driver?: string;
  cuota?: number;
  estado?: string;
  km?: number;
  serviceCadaMeses?: number;
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
  km: { col: 'km', ok: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10_000_000 },
  serviceCadaMeses: { col: 'service_cada_meses', ok: (v) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 60 },
  lastServiceDate: { col: 'last_service_date', ok: (v) => typeof v === 'string' && FECHA.test(v) },
  vtvDate: { col: 'vtv_date', ok: (v) => typeof v === 'string' && FECHA.test(v) },
  seguroDate: { col: 'seguro_date', ok: (v) => typeof v === 'string' && FECHA.test(v) },
};

app.patch<{ Params: { id: string }; Body: CarPatch }>('/api/cars/:id', async (req, reply) => {
  const actual = selCar.get(req.params.id) as CarRow | undefined;
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

  db.prepare(`UPDATE cars SET ${sets.join(', ')} WHERE id = ?`).run(...vals, req.params.id);
  return carToJson(selCar.get(req.params.id) as CarRow);
});

interface NuevoCar {
  plate: string;
  model: string;
  year: number;
  driver: string;
  cuota: number;
  km: number;
}

app.post<{ Body: NuevoCar }>('/api/cars', async (req, reply) => {
  const b = req.body ?? ({} as NuevoCar);
  const plate = String(b.plate ?? '').trim().toUpperCase();
  const model = String(b.model ?? '').trim();
  if (!plate) return reply.code(400).send({ error: 'La chapa es obligatoria' });
  if (!model) return reply.code(400).send({ error: 'La marca y modelo son obligatorios' });

  const dup = db.prepare('SELECT id FROM cars WHERE UPPER(plate) = ?').get(plate);
  if (dup) return reply.code(409).send({ error: 'Ya existe un vehículo con esa chapa' });

  const hoy = new Date().toISOString().slice(0, 10);
  const enMeses = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  };
  const car = {
    id: 'c' + Date.now().toString(36),
    plate,
    model,
    year: Number.isInteger(b.year) && b.year > 1950 && b.year < 2100 ? b.year : 2018,
    driver: String(b.driver ?? '').trim() || 'Sin chofer',
    cuota: Number.isInteger(b.cuota) && b.cuota >= 0 ? b.cuota : 0,
    estado: 'activo',
    km: Number.isInteger(b.km) && b.km >= 0 ? b.km : 80000,
    service_cada_meses: 6,
    last_service_date: hoy,
    vtv_date: enMeses(12),
    seguro_date: enMeses(12),
  };
  db.prepare(`
    INSERT INTO cars (id, plate, model, year, driver, cuota, estado, km, service_cada_meses, last_service_date, vtv_date, seguro_date)
    VALUES (@id, @plate, @model, @year, @driver, @cuota, @estado, @km, @service_cada_meses, @last_service_date, @vtv_date, @seguro_date)
  `).run(car);

  return reply.code(201).send(carToJson(selCar.get(car.id) as CarRow));
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
