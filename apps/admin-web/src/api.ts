import { useCallback, useEffect, useState } from 'react';
import type { Car, CarLocation, Mov, Pago } from './types';

/** Las fechas viajan como ISO `YYYY-MM-DD`. Se parsean a mediodía UTC para que
 *  ningún huso horario corra el día al construir el Date. */
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type CarDto = Omit<Car, 'lastServiceDate' | 'seguroDate'> & { lastServiceDate: string; seguroDate: string };
type MovDto = Omit<Mov, 'date'> & { date: string };
type PagoDto = Omit<Pago, 'fecha'> & { fecha: string };

const toCar = (c: CarDto): Car => ({ ...c, lastServiceDate: parseDate(c.lastServiceDate), seguroDate: parseDate(c.seguroDate) });
const toMov = (m: MovDto): Mov => ({ ...m, date: parseDate(m.date) });
const toPago = (p: PagoDto): Pago => ({ ...p, fecha: parseDate(p.fecha) });

export class SinSesion extends Error {}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  // El Content-Type solo va cuando hay cuerpo: si se anuncia JSON y el cuerpo
  // llega vacío (DELETE, logout), Fastify rechaza el pedido con un 400 antes de
  // que la ruta llegue a ejecutarse. Con FormData tampoco se declara: lo pone
  // el navegador, que es el único que sabe el separador que va a usar.
  const headers = init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined;
  const res = await fetch(url, { credentials: 'same-origin', ...init, headers: { ...headers, ...init?.headers } });
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    const msg = (cuerpo as { error?: string } | null)?.error ?? `Error ${res.status}`;
    throw res.status === 401 ? new SinSesion(msg) : new Error(msg);
  }
  return res.json() as Promise<T>;
}

export interface Sesion {
  usuario: string;
  nombre: string;
}

/** Sesión activa del usuario, para el panel "Sesiones activas". */
export interface SesionActiva {
  id: number;
  ip: string | null;
  userAgent: string | null;
  creada: string;
  ultimoUso: string;
  expira: string;
  actual: boolean;
}

export const listarSesiones = () => req<SesionActiva[]>('/api/sesiones');
export const revocarSesion = (id: number) => req<{ ok: boolean }>(`/api/sesiones/${id}`, { method: 'DELETE' });
export const revocarOtrasSesiones = () => req<{ ok: boolean; cerradas: number }>('/api/sesiones', { method: 'DELETE' });

export interface Auth {
  sesion: Sesion | null;
  cargando: boolean;
  entrar: (usuario: string, password: string) => Promise<void>;
  salir: () => void;
}

/** Sesión del panel. La cookie es httpOnly, así que el cliente nunca ve el
 *  token: solo le pregunta al servidor si sigue siendo válida. */
export function useAuth(): Auth {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    req<{ autenticado: boolean; usuario?: string; nombre?: string }>('/api/me')
      .then((m) => vivo && setSesion(m.autenticado ? { usuario: m.usuario!, nombre: m.nombre! } : null))
      .catch(() => vivo && setSesion(null))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const entrar = useCallback(async (usuario: string, password: string) => {
    setSesion(await req<Sesion>('/api/login', { method: 'POST', body: JSON.stringify({ usuario, password }) }));
  }, []);

  const salir = useCallback(() => {
    req('/api/logout', { method: 'POST' })
      .catch(() => {})
      .finally(() => setSesion(null));
  }, []);

  return { sesion, cargando, entrar, salir };
}

export interface NuevoCarPayload {
  plate: string;
  model: string;
  year: number;
  gpsTag: string;
  kilometraje?: number;
  lastServiceDate?: string;
  serviceCada?: number;
  serviceUnidad?: 'dias' | 'meses';
  seguroDate?: string;
  seguroNombre?: string;
  seguroCada?: number;
}

export interface NuevoPagoPayload {
  /** Identidad del chofer: su `driverId`, o el nombre como fallback en datos
   *  viejos. El servidor resuelve cualquiera de los dos contra `drivers`. */
  driver: string | number;
  carId: string | null;
  fecha: string;
  monto: number;
  tipo: 'pago' | 'ajuste';
  nota?: string;
}

export interface RegistrarServicePayload {
  fecha: string;
  descripcion: string;
  kilometraje?: number;
  costo?: number;
  comprobante?: File | null;
}

export interface ReportExportPayload {
  period: { type: 'semana' | 'mes' | 'jul' | 'd90' | 'custom'; from?: string; to?: string };
  include: 'gastos' | 'ingresos' | 'ambos';
  carIds: 'todos' | string[];
  categories: 'todas' | string[];
  search?: string;
  format: 'pdf' | 'xlsx';
}

export interface ReportExportResponse {
  file: { name: string; url: string; mimeType: string };
  counts: { ingresos: number; gastos: number; total: number };
}

export const exportFleetReport = (payload: ReportExportPayload) => req<ReportExportResponse>('/api/reports/export', { method: 'POST', body: JSON.stringify(payload) });

export interface DriverCredentials {
  username: string;
  password: string;
}

export interface AssignDriverPayload extends DriverCredentials {
  driver: string;
  cuota: number;
}

export interface FleetStore {
  cars: Car[];
  movs: Mov[];
  pagos: Pago[];
  locations: CarLocation[];
  cargando: boolean;
  error: string;
  patchCar: (id: string, patch: Partial<Car>) => void;
  updateCar: (id: string, patch: Partial<Car>) => Promise<Car>;
  previewDriverCredentials: (id: string, driver: string) => Promise<DriverCredentials>;
  assignDriver: (id: string, payload: AssignDriverPayload) => Promise<Car>;
  addCar: (nuevo: NuevoCarPayload) => Promise<Car>;
  deleteCar: (id: string) => Promise<{ plate: string; movs: number }>;
  mandarATaller: (id: string, datos: { razon: string; monto: number; comprobante: File | null }) => Promise<void>;
  registrarService: (id: string, datos: RegistrarServicePayload) => Promise<{ car: Car; mov?: Mov }>;
  exportReport: (payload: ReportExportPayload) => Promise<ReportExportResponse>;
  addPago: (nuevo: NuevoPagoPayload) => Promise<Pago>;
  deletePago: (id: number) => Promise<void>;
}

/**
 * Estado de la flota respaldado por la API. Las mutaciones se aplican primero en
 * memoria para que la interfaz responda al instante y se confirman contra el
 * servidor; si el servidor rechaza, se recarga el estado real y se informa.
 */
export function useFleetStore(onError: (msg: string) => void, onSinSesion: () => void): FleetStore {
  const [cars, setCars] = useState<Car[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [locations, setLocations] = useState<CarLocation[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    const s = await req<{ cars: CarDto[]; movs: MovDto[]; pagos: PagoDto[] }>('/api/state');
    setCars(s.cars.map(toCar));
    setMovs(s.movs.map(toMov));
    setPagos(s.pagos.map(toPago));
  }, []);

  const recargarLocations = useCallback(async () => {
    const latest = await req<CarLocation[]>('/api/locations');
    setLocations(latest);
  }, []);

  useEffect(() => {
    let vivo = true;
    recargar()
      .then(() => vivo && setError(''))
      .catch((e: Error) => {
        if (!vivo) return;
        if (e instanceof SinSesion) onSinSesion();
        else setError(e.message);
      })
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [recargar, onSinSesion]);

  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      recargarLocations().catch((e: Error) => {
        if (vivo && e instanceof SinSesion) onSinSesion();
      });
    };
    cargar();
    const timer = setInterval(cargar, 30_000);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, [recargarLocations, onSinSesion]);

  const patchCar = useCallback(
    (id: string, patch: Partial<Car>) => {
      setCars((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      const dto: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) dto[k] = v instanceof Date ? isoDate(v) : v;
      req(`/api/cars/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }).catch((e: Error) => {
        // Si la sesión venció, no tiene sentido avisar de un guardado fallido:
        // el usuario vuelve al login y reintenta con sesión nueva.
        if (e instanceof SinSesion) return onSinSesion();
        onError('No se pudo guardar: ' + e.message);
        void recargar();
      });
    },
    [onError, onSinSesion, recargar],
  );

  const previewDriverCredentials = useCallback(
    (id: string, driver: string) =>
      req<DriverCredentials>(`/api/cars/${id}/chofer-credenciales/preview`, {
        method: 'POST',
        body: JSON.stringify({ driver }),
      }),
    [],
  );

  const updateCar = useCallback(async (id: string, patch: Partial<Car>) => {
    const dto: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) dto[k] = v instanceof Date ? isoDate(v) : v;
    const car = toCar(await req<CarDto>(`/api/cars/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }));
    setCars((cs) => cs.map((c) => (c.id === id ? car : c)));
    return car;
  }, []);

  const assignDriver = useCallback(async (id: string, payload: AssignDriverPayload) => {
    const r = await req<{ car: CarDto }>(`/api/cars/${id}/asignar-chofer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const car = toCar(r.car);
    setCars((cs) => cs.map((c) => (c.id === id ? car : c)));
    return car;
  }, []);

  const addCar = useCallback(async (nuevo: NuevoCarPayload) => {
    const creado = toCar(await req<CarDto>('/api/cars', { method: 'POST', body: JSON.stringify(nuevo) }));
    setCars((cs) => [...cs, creado]);
    return creado;
  }, []);

  const deleteCar = useCallback(async (id: string) => {
    const r = await req<{ plate: string; movs: number }>(`/api/cars/${id}`, { method: 'DELETE' });
    // Los movimientos se van en cascada del lado del servidor, así que hay que
    // sacarlos también acá o quedarían sumando en los totales de la sesión.
    setCars((cs) => cs.filter((c) => c.id !== id));
    setMovs((ms) => ms.filter((m) => m.carId !== id));
    return r;
  }, []);

  // Mandar a taller cambia el estado y crea el gasto en la misma operación, así
  // que no puede aplicarse en optimista: se espera al servidor y se aplican las
  // dos cosas juntas o ninguna.
  const mandarATaller = useCallback(async (id: string, datos: { razon: string; monto: number; comprobante: File | null }) => {
    const fd = new FormData();
    fd.append('razon', datos.razon);
    fd.append('monto', String(datos.monto));
    if (datos.comprobante) fd.append('comprobante', datos.comprobante);
    const r = await req<{ car: CarDto; mov: MovDto }>(`/api/cars/${id}/taller`, { method: 'POST', body: fd });
    setCars((cs) => cs.map((c) => (c.id === id ? toCar(r.car) : c)));
    setMovs((ms) => [toMov(r.mov), ...ms]);
  }, []);

  const registrarService = useCallback(async (id: string, datos: RegistrarServicePayload) => {
    const fd = new FormData();
    fd.append('fecha', datos.fecha);
    fd.append('descripcion', datos.descripcion);
    if (datos.kilometraje !== undefined) fd.append('kilometraje', String(datos.kilometraje));
    if (datos.costo !== undefined) fd.append('costo', String(datos.costo));
    if (datos.comprobante) fd.append('comprobante', datos.comprobante);
    const r = await req<{ car: CarDto; mov?: MovDto }>(`/api/cars/${id}/service`, { method: 'POST', body: fd });
    const car = toCar(r.car);
    setCars((cs) => cs.map((c) => (c.id === id ? car : c)));
    if (r.mov) setMovs((ms) => [toMov(r.mov!), ...ms]);
    return { car, ...(r.mov ? { mov: toMov(r.mov) } : {}) };
  }, []);

  const exportReport = useCallback((payload: ReportExportPayload) => exportFleetReport(payload), []);

  // Un pago no se aplica en optimista: cuánto cancela de cada cuota lo decide
  // la imputación sobre el conjunto, así que hasta que el servidor no lo
  // confirma no hay forma de saber qué mostrar.
  const addPago = useCallback(async (nuevo: NuevoPagoPayload) => {
    const creado = toPago(await req<PagoDto>('/api/pagos', { method: 'POST', body: JSON.stringify(nuevo) }));
    setPagos((ps) => [creado, ...ps]);
    return creado;
  }, []);

  const deletePago = useCallback(async (id: number) => {
    await req(`/api/pagos/${id}`, { method: 'DELETE' });
    setPagos((ps) => ps.filter((p) => p.id !== id));
  }, []);

  return {
    cars,
    movs,
    pagos,
    locations,
    cargando,
    error,
    patchCar,
    updateCar,
    previewDriverCredentials,
    assignDriver,
    addCar,
    deleteCar,
    mandarATaller,
    registrarService,
    exportReport,
    addPago,
    deletePago,
  };
}
