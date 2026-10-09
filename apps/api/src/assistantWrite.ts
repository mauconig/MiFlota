import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { CarRow } from './db.js';
import { CATS_EGRESO, MAX_EGRESO_LINEAS, MAX_EGRESO_MONTO, normalizarCategoria } from './expenseCategories.js';
import { localDateISO } from './time.js';

export interface AssistantExpenseDraftItem {
  id: string;
  description: string;
  amount: number;
  displayAmount: string;
}

/** Carga de gastos propuesta por el asistente. No escribe nada: es un borrador
 *  que el usuario revisa, edita o descarta antes de confirmarlo. */
export interface AssistantExpenseDraft {
  id: string;
  kind: 'gastos';
  vehicle: { carId: string; plate: string; model: string };
  category: string;
  date: string;
  items: AssistantExpenseDraftItem[];
  total: number;
  displayTotal: string;
}

export interface AssistantExpenseInput {
  carId?: string;
  description?: string;
  amount?: number;
  category?: string;
  date?: string;
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const money = (v: number) => 'Gs. ' + new Intl.NumberFormat('es-PY').format(v);
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;

/** Resuelve un vehículo por chapa, id o modelo, siempre dentro del dueño. */
function findCar(db: Database.Database, ownerId: number, value: string): CarRow {
  const cars = db.prepare('SELECT * FROM cars WHERE owner_id = ?').all(ownerId) as CarRow[];
  const needle = norm(value);
  if (!needle) throw Error('Indicá el vehículo de la carga.');
  const exact = cars.find((c) => norm(c.plate) === needle || norm(c.id) === needle);
  if (exact) return exact;
  const matches = cars.filter((c) => norm(`${c.id} ${c.plate} ${c.model}`).includes(needle));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw Error(`Precisá el vehículo: hay varios que coinciden (${matches.map((c) => c.plate).join(', ')}).`);
  const plates = cars.map((c) => c.plate).slice(0, 12).join(', ');
  throw Error(cars.length ? `No encontré ningún vehículo que coincida con "${value}". Los vehículos son: ${plates}.` : 'La flota todavía no tiene vehículos cargados.');
}

function cleanItem(raw: unknown): { description: string; amount: number } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Cada línea del gasto necesita una descripción y un monto.');
  const item = raw as { description?: unknown; amount?: unknown };
  const description = typeof item.description === 'string' ? item.description.trim().slice(0, 120) : '';
  if (!description) throw Error('Cada línea del gasto necesita una descripción.');
  const amount = typeof item.amount === 'number' ? item.amount : Number(String(item.amount ?? '').replace(/\D/g, ''));
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_EGRESO_MONTO) throw Error(`El monto de "${description}" no es válido.`);
  return { description, amount };
}

/** Arma el borrador de una carga de gastos. Valida el vehículo, la categoría y
 *  cada línea, pero no toca la base. */
export function proposeExpenseDraft(db: Database.Database, ownerId: number, value: unknown, today = localDateISO()): AssistantExpenseDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Carga de gastos inválida.');
  const args = value as { vehicle?: unknown; category?: unknown; items?: unknown; date?: unknown };
  if (typeof args.vehicle !== 'string' || !args.vehicle.trim()) throw Error('Indicá el vehículo de la carga.');
  const car = findCar(db, ownerId, args.vehicle);
  const category = normalizarCategoria(typeof args.category === 'string' ? args.category : '');
  if (!CATS_EGRESO.has(category)) throw Error(`Elegí una categoría válida (${[...CATS_EGRESO].join(', ')}).`);
  let date = today;
  if (args.date !== undefined) {
    if (typeof args.date !== 'string' || !validDate(args.date)) throw Error('La fecha del gasto no es válida (YYYY-MM-DD).');
    if (args.date > today) throw Error('La fecha del gasto no puede ser futura.');
    date = args.date;
  }
  if (!Array.isArray(args.items) || !args.items.length) throw Error('La carga no tiene ninguna línea de gasto.');
  if (args.items.length > MAX_EGRESO_LINEAS) throw Error(`La carga no puede tener más de ${MAX_EGRESO_LINEAS} líneas.`);
  const items = args.items.map((raw) => {
    const { description, amount } = cleanItem(raw);
    return { id: randomUUID(), description, amount, displayAmount: money(amount) };
  });
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { id: randomUUID(), kind: 'gastos', vehicle: { carId: car.id, plate: car.plate, model: car.model }, category, date, items, total, displayTotal: money(total) };
}

/** Escribe el borrador ya confirmado. Revalida todo contra el dueño: el
 *  cliente pudo editar las líneas, así que nada de lo que llega se confía. */
export function applyExpenseDraft(db: Database.Database, ownerId: number, value: unknown, today = localDateISO()): { created: number; total: number; items: (AssistantExpenseDraftItem & { carId: string; plate: string; category: string; date: string })[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Carga de gastos inválida.');
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items) || !items.length) throw Error('La carga no tiene ninguna línea de gasto.');
  if (items.length > MAX_EGRESO_LINEAS) throw Error(`La carga no puede tener más de ${MAX_EGRESO_LINEAS} líneas.`);
  const selectCar = db.prepare('SELECT * FROM cars WHERE id = ? AND owner_id = ?');
  const insert = db.prepare(
    `INSERT INTO movs (owner_id, car_id, type, amount, date, descripcion, cat, estado, comprobante, comprobante_nombre, comprobante_tipo)
     VALUES (?, ?, 'egreso', ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
  );
  const prepared = (items as AssistantExpenseInput[]).map((raw) => {
    const carId = typeof raw.carId === 'string' ? raw.carId : '';
    const car = selectCar.get(carId, ownerId) as CarRow | undefined;
    if (!car) throw Error('Uno de los vehículos de la carga no existe o no es tuyo.');
    const { description, amount } = cleanItem(raw);
    const category = normalizarCategoria(typeof raw.category === 'string' ? raw.category : '');
    if (!CATS_EGRESO.has(category)) throw Error(`Elegí una categoría válida (${[...CATS_EGRESO].join(', ')}).`);
    let date = today;
    if (raw.date !== undefined) {
      if (typeof raw.date !== 'string' || !validDate(raw.date)) throw Error('La fecha del gasto no es válida (YYYY-MM-DD).');
      if (raw.date > today) throw Error('La fecha del gasto no puede ser futura.');
      date = raw.date;
    }
    return { car, description, amount, category, date };
  });
  const run = db.transaction(() => prepared.map((item) => insert.run(ownerId, item.car.id, item.amount, item.date, item.description, item.category)));
  const inserted = run();
  const total = prepared.reduce((sum, item) => sum + item.amount, 0);
  return {
    created: inserted.length,
    total,
    items: prepared.map((item, index) => ({
      id: String(inserted[index].lastInsertRowid),
      carId: item.car.id,
      plate: item.car.plate,
      description: item.description,
      amount: item.amount,
      displayAmount: money(item.amount),
      category: item.category,
      date: item.date,
    })),
  };
}
