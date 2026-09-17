import type Database from 'better-sqlite3';
import type { CarRow, MovRow, PagoRow, ReporteRow, LocationRow } from './db.js';
import type { AssistantQueryRequest, AssistantQueryResult, AssistantQueryRow } from './assistant.js';
import { imputar } from './cobranza.js';
import { localDateISO } from './time.js';

export const entities = ['finanzas', 'vehiculos', 'choferes', 'cuotas', 'pagos', 'ajustes', 'gastos', 'deudas', 'movimientos', 'mantenimiento', 'seguros', 'gps', 'ubicaciones', 'fallas', 'secciones'] as const;
export const metrics = ['facturado', 'cobrado', 'gastos', 'ganancia', 'deuda', 'cantidad'] as const;
export const groups = ['auto', 'modelo', 'chofer', 'categoria', 'fecha', 'estado', 'seccion', 'ninguno'] as const;
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
// El modelo a veces copia palabras de relleno de la pregunta ("toda la flota",
// "los autos", "en total") dentro de un filtro. Sin esto el filtro no coincide
// con nada y la consulta devolvía cero como si no hubiera datos.
const FILLER_FILTERS = new Set(['total', 'totales', 'todos', 'todas', 'todo', 'toda', 'auto', 'autos', 'vehiculo', 'vehiculos', 'flota', 'ninguno', 'ninguna', 'ningun', 'null', 'undefined', 'nan', 'general', 'completo', 'completa', 'cualquiera', 'cualesquiera']);
const FILLER_FILTER_KEYS = ['vehicle', 'model', 'driver', 'category', 'status', 'section'] as const;
const ISO_DATE = /\d{4}-\d{2}-\d{2}/g;

/**
 * Limpia los filtros antes de consultar. El modelo suele mezclar en un mismo
 * campo cosas que no son filtros:
 *   - palabras de relleno ("toda la flota", "los autos", "en total"), que hacían
 *     que el filtro no coincida con nada y la consulta devolviera cero filas;
 *   - las fechas del período ("auto 2026-07-01 2026-07-31"), que dejaban el
 *     período personalizado sin from/to y hacían fallar la consulta para siempre.
 * Las fechas se rescatan como rango y el resto se descarta o se valida después.
 */
function sanitizeFilters(r: AssistantQueryRequest): AssistantQueryRequest {
  const clean = { ...r };
  const dates: string[] = [];
  for (const key of FILLER_FILTER_KEYS) {
    const value = clean[key];
    if (typeof value !== 'string') continue;
    const found = value.match(ISO_DATE);
    if (found) {
      dates.push(...found);
      const rest = value.replace(ISO_DATE, ' ').trim();
      if (rest && !FILLER_FILTERS.has(norm(rest))) clean[key] = rest;
      else delete clean[key];
    } else if (!value.trim() || FILLER_FILTERS.has(norm(value))) {
      delete clean[key];
    }
  }
  if (dates.length) {
    const sorted = [...new Set(dates)].sort();
    if (clean.from === undefined) clean.from = sorted[0];
    if (clean.to === undefined) clean.to = sorted[sorted.length - 1];
    // Con fechas explícitas el período relativo las ignoraría.
    if (!clean.period || clean.period === 'personalizado' || clean.period === 'total') clean.period = 'personalizado';
  }
  return clean;
}

/** Completa un período personalizado al que le falta un extremo. */
function completeCustomRange(r: AssistantQueryRequest, today: string): AssistantQueryRequest {
  if (r.period !== 'personalizado') return r;
  const clean = { ...r };
  if (clean.from && !clean.to && validDate(clean.from)) clean.to = lastDayOfMonth(clean.from, today);
  if (clean.to && !clean.from && validDate(clean.to)) clean.from = clean.to.slice(0, 7) + '-01';
  return clean;
}
function lastDayOfMonth(iso: string, today: string): string {
  const [year, month] = iso.split('-').map(Number);
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return last > today ? today : last;
}
const categoryNeedle = (s: string) => {
  const raw = norm(s);
  const withoutExpensePrefix = raw.replace(/^gastos?(?:de)?/, '');
  return withoutExpensePrefix.length >= 3 ? withoutExpensePrefix : raw;
};
const categoryMatches = (value: string, filter: string) => {
  const candidate = norm(value);
  const needle = categoryNeedle(filter);
  return !!needle && (candidate.includes(needle) || needle.includes(candidate));
};
const money = (v: number) => 'Gs. ' + new Intl.NumberFormat('es-PY').format(v);
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
const dayOf = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(s));

export function queryRange(r: AssistantQueryRequest, today: string) {
  const to = r.period === 'personalizado' ? r.to ?? today : today;
  if (!validDate(to) || to > today) throw Error('Fecha final inválida o futura');
  let from: string | null = null;
  if (r.period === 'personalizado') {
    if (!r.from || !r.to) {
      // Mensaje accionable: el modelo necesita saber qué mandar para corregir
      // en vez de rendirse y contestar sin datos.
      const [year, month] = today.split('-').map(Number);
      const prevEnd = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
      throw Error(`Período personalizado sin fechas: enviá from y to en formato YYYY-MM-DD. Hoy es ${today}; el mes pasado sería from=${prevEnd.slice(0, 7)}-01, to=${prevEnd}. Para todo el historial usá period total.`);
    }
    if (!validDate(r.from) || r.from > to) throw Error(`Período personalizado inválido: revisá from y to (YYYY-MM-DD, from no puede ser posterior a to).`);
    from = r.from;
  } else if (r.period === 'mes') from = to.slice(0, 7) + '-01';
  else if (r.period === 'semana' || r.period === '90dias') {
    const date = new Date(to + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() - (r.period === 'semana' ? 6 : 89));
    from = date.toISOString().slice(0, 10);
  }
  return { from, to };
}

type Driver = { id: number; nombre: string; estado: string; driver_username: string | null; creado: string };
type Section = { id: number; name: string; position: number };
type Atom = AssistantQueryRow & { date?: string; driver?: string; category?: string; status?: string; model?: string; section?: string };

/** Only fixed, parameterized reads enter this module. Credentials are never selected. */
export function queryFleetData(db: Database.Database, ownerId: number, r: AssistantQueryRequest, today = localDateISO()): AssistantQueryResult {
  if (!r || !entities.includes(r.entity)) throw Error('Entidad de consulta inválida');
  const allowedKeys = new Set(['entity','metric','groupBy','period','from','to','vehicle','driver','model','category','status','section','limit','offset','order','history','assigned']);
  if (Object.keys(r).some(key => !allowedKeys.has(key))) throw Error('Parámetro de consulta no permitido');
  for (const [key, allowed] of Object.entries({ metric: metrics, groupBy: groups, period: ['semana', 'mes', '90dias', 'total', 'personalizado'], order: ['asc', 'desc'], history: [true, false], assigned: [true, false] })) {
    if (r[key as keyof AssistantQueryRequest] !== undefined && !(allowed as readonly unknown[]).includes(r[key as keyof AssistantQueryRequest])) throw Error('Parámetro inválido: ' + key);
  }
  for (const key of ['vehicle', 'driver', 'model', 'category', 'status', 'section', 'from', 'to'] as const) if (r[key] !== undefined && (typeof r[key] !== 'string' || r[key]!.length > 120)) throw Error('Filtro inválido: ' + key);
  for (const key of ['limit', 'offset'] as const) if (r[key] !== undefined && (!Number.isInteger(r[key]) || r[key]! < (key === 'limit' ? 1 : 0) || r[key]! > (key === 'limit' ? 50 : 10000))) throw Error('Límite inválido');
  // Los filtros se limpian y se validan antes de que puedan dejar la consulta
  // en cero o hacerla fallar.
  r = completeCustomRange(sanitizeFilters(r), today);
  const { entity } = r;
  const defaults: Partial<Record<typeof entity, typeof metrics[number]>> = { finanzas: 'facturado', cuotas: 'facturado', pagos: 'cobrado', ajustes: 'cobrado', gastos: 'gastos', deudas: 'deuda' };
  const metric = r.metric ?? defaults[entity] ?? 'cantidad';
  if (entity !== 'finanzas' && metric !== 'cantidad' && metric !== defaults[entity]) throw Error('Métrica incompatible con la entidad');
  if (entity === 'finanzas' && metric === 'deuda') throw Error('Para deuda usar entidad deudas');
  const groupBy = r.groupBy ?? (entity === 'deudas' ? 'chofer' : 'ninguno');
  const range = queryRange(r, today);
  const dateAllowed = (s: string) => { const d = dayOf(s); return d <= range.to && (!range.from || d >= range.from); };
  const cars = db.prepare('SELECT id, owner_id, section_id, plate, model, year, driver_id, driver, cuota, estado, gps_tag, service_cada, service_unidad, last_service_date, kilometraje, kilometraje_actualizado, seguro_date, seguro_costo, seguro_periodo, seguro_nombre, seguro_cada FROM cars WHERE owner_id=?').all(ownerId) as CarRow[];
  const drivers = db.prepare('SELECT id,nombre,estado,driver_username,creado FROM drivers WHERE owner_id=?').all(ownerId) as Driver[];
  const sections = db.prepare('SELECT id,name,position FROM sections WHERE owner_id=? ORDER BY position,id').all(ownerId) as Section[];
  const byId = new Map(cars.map(c => [c.id, c]));
  const byDriver = new Map(drivers.map(d => [d.id, d]));
  const sectionById = new Map(sections.map(s => [s.id, s.name]));
  const sectionOf = (carId: string | undefined) => (carId ? sectionById.get(byId.get(carId)?.section_id ?? -1) ?? 'Sin sección' : 'Sin sección');
  const matchingDrivers = r.driver ? drivers.filter(d => norm(d.nombre).includes(norm(r.driver!))) : [];
  const exactDriver = matchingDrivers.find(d => norm(d.nombre) === norm(r.driver!));
  if (r.driver && matchingDrivers.length > 1 && !exactDriver) throw Error('Precisá el chofer: ' + matchingDrivers.map(d => d.nombre).join(', '));
  // Un filtro que no coincide con nada devolvía cero filas y el asistente
  // contestaba "no hay datos". Ahora se avisa del filtro inválido para que el
  // modelo lo corrija en vez de afirmar que la flota está vacía.
  if (r.driver && !matchingDrivers.length) throw Error(`No encontré ningún chofer que coincida con "${r.driver}". Omití el filtro driver para ver todos los choferes.`);
  if (r.vehicle && !cars.some(c => norm(`${c.id} ${c.plate} ${c.model}`).includes(norm(r.vehicle!)))) throw Error(`No encontré ningún vehículo que coincida con "${r.vehicle}". Omití el filtro vehicle para consultar toda la flota.`);
  if (r.model && !cars.some(c => norm(c.model).includes(norm(r.model!)))) throw Error(`No encontré ningún modelo que coincida con "${r.model}". Los modelos cargados son: ${[...new Set(cars.map(c => c.model))].slice(0, 12).join(', ')}.`);
  if (r.section && !sections.some(s => norm(s.name).includes(norm(r.section!)))) throw Error(sections.length ? `No encontré ninguna sección que coincida con "${r.section}". Las secciones son: ${sections.map(s => s.name).join(', ')}.` : 'La flota todavía no tiene secciones cargadas.');
  if (r.category) {
    const knownCategories = (db.prepare("SELECT DISTINCT cat c FROM movs WHERE owner_id=? AND cat IS NOT NULL AND trim(cat)<>''").all(ownerId) as { c: string }[]).map(row => row.c);
    if (!knownCategories.some(c => categoryMatches(c, r.category!)) && !['cuota', 'pago', 'ajuste'].some(c => categoryMatches(c, r.category!))) throw Error(`Categoría desconocida: "${r.category}". Las categorías cargadas son: ${knownCategories.join(', ')}.`);
  }
  const matchesDriver = (name: string) => !r.driver || (exactDriver ? norm(name) === norm(exactDriver.nombre) : norm(name).includes(norm(r.driver)));
  const driverName = (id: number | null, fallback: string | null) => (id ? byDriver.get(id)?.nombre : null) ?? fallback ?? 'Sin chofer';
  const matchesCar = (id: string | undefined) => {
    const c = id ? byId.get(id) : undefined;
    if (id && !c) return false;
    return (!r.vehicle || !!c && norm(`${c.id} ${c.plate} ${c.model}`).includes(norm(r.vehicle))) && (!r.model || !!c && norm(c.model).includes(norm(r.model)));
  };
  const atoms: Atom[] = [];
  const add = (a: Atom) => {
    const section = a.section ?? sectionOf(a.carId);
    if (r.section && !norm(section).includes(norm(r.section))) return;
    if (!matchesCar(a.carId) || !matchesDriver(a.driver ?? 'Sin chofer') || r.category && !categoryMatches(a.category ?? '', r.category) || r.status && norm(a.status ?? '') !== norm(r.status)) return;
    atoms.push({ ...a, section, model: a.carId ? byId.get(a.carId)?.model : a.model });
  };
  const vehicleEntities = ['vehiculos', 'mantenimiento', 'seguros', 'gps'];
  if (vehicleEntities.includes(entity)) {
    for (const c of cars) {
      if (r.assigned !== undefined && !!c.driver_id !== r.assigned) continue;
      add({ label: c.plate, carId: c.id, driver: driverName(c.driver_id, c.driver), status: c.estado, value: 1,
      details: { Sección: sectionOf(c.id), Modelo: c.model, Año: String(c.year), Chofer: driverName(c.driver_id, c.driver), Estado: c.estado, 'GPS-TAG': c.gps_tag || 'Sin datos', 'Cuota diaria': money(c.cuota), Kilometraje: c.kilometraje_actualizado ? String(c.kilometraje) : 'Sin lectura registrada', 'Kilometraje actualizado': c.kilometraje_actualizado || 'Sin datos', 'Último mantenimiento': c.last_service_date || 'Sin datos', 'Mantenimiento cada': c.service_cada ? `${c.service_cada} ${c.service_unidad}` : 'Sin configurar', Seguro: c.seguro_nombre || 'Sin datos', 'Vencimiento seguro': c.seguro_date || 'Sin datos', 'Costo seguro': money(c.seguro_costo), 'Periodicidad seguro': c.seguro_periodo, 'Renovación cada': c.seguro_cada ? `${c.seguro_cada} meses` : 'Sin configurar' } });
    }
  } else if (entity === 'secciones') {
    for (const s of sections) {
      const inSection = cars.filter(c => c.section_id === s.id);
      if (r.assigned !== undefined && !!inSection.length !== r.assigned) continue;
      if ((r.vehicle || r.model) && !inSection.some(c => matchesCar(c.id))) continue;
      add({ label: s.name, section: s.name, value: 1, details: { Sección: s.name, Vehículos: String(inSection.length), Chapas: inSection.map(c => c.plate).join(', ') || 'Sin vehículos', Choferes: inSection.map(c => driverName(c.driver_id, c.driver)).join(', ') || 'Sin chofer' } });
    }
  } else if (entity === 'choferes') {
    for (const d of drivers) {
      const assigned = cars.filter(c => c.driver_id === d.id && c.estado !== 'baja');
      if (r.assigned !== undefined && !!assigned.length !== r.assigned) continue;
      const c = assigned.find(c => matchesCar(c.id));
      if ((r.vehicle || r.model) && !c) continue;
      add({ label: d.nombre, driver: d.nombre, status: d.estado, carId: c?.id, value: 1, details: { Estado: d.estado, Usuario: d.driver_username || 'Sin usuario', Vehículos: assigned.map(c => c.plate).join(', ') || 'Sin auto', 'Fecha de alta': d.creado } });
    }
  } else if (entity === 'ubicaciones') {
    // Table choice is a boolean, never a model-provided SQL identifier.
    const sql = r.history ? 'SELECT l.car_id,l.latitude,l.longitude,l.accuracy,l.recorded_at,l.received_at,l.mocked FROM driver_location_history l JOIN cars c ON c.id=l.car_id WHERE c.owner_id=?' : 'SELECT l.car_id,l.latitude,l.longitude,l.accuracy,l.recorded_at,l.received_at,l.mocked FROM driver_locations l JOIN cars c ON c.id=l.car_id WHERE c.owner_id=?';
    for (const l of db.prepare(sql).all(ownerId) as LocationRow[]) {
      if (!dateAllowed(l.recorded_at)) continue;
      const c = byId.get(l.car_id)!;
      add({ label: c.plate, carId: c.id, driver: driverName(c.driver_id, c.driver), status: c.estado, date: dayOf(l.recorded_at), value: 1, details: { Latitud: String(l.latitude), Longitud: String(l.longitude), 'Precisión (m)': l.accuracy == null ? 'Sin datos' : String(l.accuracy), Registrada: l.recorded_at, Recibida: l.received_at, Simulada: l.mocked ? 'Sí' : 'No' } });
    }
  } else if (entity === 'fallas') {
    const reports = db.prepare('SELECT r.id,r.car_id,r.driver_id,r.driver,r.cat,r.urgencia,r.texto,r.estado,r.fecha FROM reportes_falla r JOIN cars c ON c.id=r.car_id WHERE r.owner_id=? AND c.owner_id=?').all(ownerId, ownerId) as ReporteRow[];
    for (const f of reports) if (dateAllowed(f.fecha)) add({ label: f.texto, carId: f.car_id, driver: driverName(f.driver_id, f.driver), category: f.cat, status: f.estado, date: dayOf(f.fecha), value: 1, details: { Vehículo: byId.get(f.car_id)!.plate, Chofer: driverName(f.driver_id, f.driver), Categoría: f.cat, Urgencia: f.urgencia, Estado: f.estado, Fecha: f.fecha } });
  } else {
    const movements = db.prepare('SELECT m.id,m.car_id,m.type,m.amount,m.date,m.descripcion,m.cat,m.estado,m.driver,m.driver_id,m.comprobante_nombre FROM movs m JOIN cars c ON c.id=m.car_id WHERE m.owner_id=? AND c.owner_id=? AND m.date<=?').all(ownerId, ownerId, range.to) as MovRow[];
    const payments = db.prepare('SELECT p.id,p.owner_id,p.car_id,p.driver,p.driver_id,p.fecha,p.monto,p.tipo,p.medio,p.nota,p.comprobante_nombre FROM pagos p LEFT JOIN cars c ON c.id=p.car_id WHERE p.owner_id=? AND (p.car_id IS NULL OR c.owner_id=?) AND p.fecha<=?').all(ownerId, ownerId, range.to) as PagoRow[];
    // Allocate against the entire account first; vehicle/date filters must not move payments to other quotas.
    const allocation = imputar(movements.filter(m => m.type === 'ingreso'), payments, m => m.driver_id ?? driverName(null, m.driver || byId.get(m.car_id)?.driver || null));
    for (const m of movements) {
      if (!dateAllowed(m.date)) continue;
      const income = m.type === 'ingreso';
      const debt = Math.max(0, m.amount - (allocation.cobrado.get(m.id) ?? 0));
      let include = entity === 'movimientos' || (entity === 'cuotas' || entity === 'deudas') && income || entity === 'gastos' && !income;
      if (entity === 'finanzas') include = metric === 'facturado' ? income : metric === 'gastos' || metric === 'ganancia' ? !income : metric === 'cantidad';
      if (!include || entity === 'deudas' && debt === 0) continue;
      const status = income ? debt === 0 ? 'pagado' : debt < m.amount ? 'parcial' : 'pendiente' : 'registrado';
      const value = metric === 'cantidad' ? 1 : entity === 'deudas' ? debt : metric === 'ganancia' ? -m.amount : m.amount;
      add({ label: m.descripcion, carId: m.car_id, driver: driverName(m.driver_id, m.driver || byId.get(m.car_id)?.driver || null), category: m.cat || (income ? 'Cuota' : 'Sin categoría'), status, date: m.date, value,
        details: { Fecha: m.date, Vehículo: byId.get(m.car_id)!.plate, Chofer: driverName(m.driver_id, m.driver || byId.get(m.car_id)?.driver || null), Tipo: income ? 'Cuota' : 'Gasto', Estado: status, Monto: money(m.amount), ...(income ? { 'Saldo pendiente': money(debt) } : {}), Comprobante: m.comprobante_nombre || 'Sin comprobante' } });
    }
    for (const p of payments) {
      if (!dateAllowed(p.fecha)) continue;
      const include = entity === 'ajustes' ? p.tipo === 'ajuste' : p.tipo === 'pago' && (entity === 'pagos' || entity === 'finanzas' && (metric === 'cobrado' || metric === 'ganancia'));
      if (!include) continue;
      add({ label: p.nota || (p.tipo === 'ajuste' ? 'Ajuste' : 'Pago'), carId: p.car_id ?? undefined, driver: driverName(p.driver_id, p.driver), category: p.tipo, status: p.tipo, date: p.fecha, value: metric === 'cantidad' ? 1 : p.monto, details: { Fecha: p.fecha, Chofer: driverName(p.driver_id, p.driver), Vehículo: p.car_id ? byId.get(p.car_id)!.plate : 'Sin vehículo', Tipo: p.tipo, Medio: p.medio || 'Sin datos', Monto: money(p.monto), Comprobante: p.comprobante_nombre || 'Sin comprobante' } });
    }
  }
  const numericDetails = ![...vehicleEntities, 'choferes', 'ubicaciones', 'fallas', 'secciones'].includes(entity);
  const grouped = new Map<string, AssistantQueryRow>();
  if (groupBy !== 'ninguno' || entity === 'finanzas') for (const a of atoms) {
    const label = groupBy === 'auto' ? a.carId ? byId.get(a.carId)!.plate : 'Sin auto' : groupBy === 'modelo' ? a.model || 'Sin modelo' : groupBy === 'chofer' ? a.driver || 'Sin chofer' : groupBy === 'categoria' ? a.category || 'Sin categoría' : groupBy === 'estado' ? a.status || 'Sin estado' : groupBy === 'seccion' ? a.section || 'Sin sección' : groupBy === 'fecha' ? a.date || 'Sin fecha' : 'Total';
    if (label === 'Sin fecha') throw Error('Esta entidad no tiene una fecha de evento para agrupar; consultá movimientos o ubicaciones');
    const entry = grouped.get(label) ?? { label, value: 0, ...(groupBy === 'auto' && a.carId ? { carId: a.carId } : {}) };
    entry.value! += a.value ?? 0;
    grouped.set(label, entry);
  }
  const rows: AssistantQueryRow[] = grouped.size ? [...grouped.values()] : atoms.map(({ label, carId, details, value }) => ({ label, carId, details, ...(numericDetails ? { value } : {}) }));
  const unit = metric === 'cantidad' ? 'cantidad' : 'PYG';
  for (const row of rows) if (row.value !== undefined) row.displayValue = unit === 'PYG' ? money(row.value) : String(row.value);
  rows.sort((a,b) => groupBy === 'fecha' ? a.label.localeCompare(b.label) : (r.order === 'asc' ? 1 : -1) * ((a.value ?? 0) - (b.value ?? 0)) || a.label.localeCompare(b.label));
  const total = atoms.reduce((sum, a) => sum + (a.value ?? 0), 0);
  const offset = r.offset ?? 0;
  const visible = rows.slice(offset, offset + (r.limit ?? 50));
  const notes: string[] = [];
  if (range.from && vehicleEntities.includes(entity)) notes.push('Los datos del vehículo describen su estado actual; no hay historial de estos campos.');
  if (!rows.length) {
    // Explicar el vacío evita que el modelo lo lea como "la flota no tiene datos"
    // y se ponga a repetir consultas hasta agotar el presupuesto.
    const explicitFilters = (['vehicle', 'driver', 'model', 'category', 'status', 'section'] as const).filter(key => r[key] !== undefined);
    const lastActivity = db.prepare('SELECT MAX(d) d FROM (SELECT MAX(date) d FROM movs WHERE owner_id=? UNION ALL SELECT MAX(fecha) d FROM pagos WHERE owner_id=?)').get(ownerId, ownerId) as { d: string | null };
    notes.push(explicitFilters.length ? `Ningún registro coincide con los filtros aplicados (${explicitFilters.join(', ')}).` : 'No hay registros que coincidan con la consulta.');
    if (range.from) notes.push(`Período consultado: ${range.from} al ${range.to}.`);
    if (lastActivity?.d) {
      notes.push(`El último movimiento registrado de la flota es del ${lastActivity.d}.`);
      if (range.from && range.from > lastActivity.d) notes.push('El período pedido es posterior al último registro, por eso no hay datos.');
    }
  }
  return { entity, metric, groupBy, ...range, total, unit, totalRows: rows.length, truncated: offset > 0 || offset + visible.length < rows.length, rows: visible, ...(notes.length ? { note: notes.join(' ') } : {}) };
}
