import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from './config';
import type { Car, Mov, Pago, PickedFile } from './types';

/** Las fechas viajan como ISO `YYYY-MM-DD`. Se parsean a mediodía para que
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
  // A diferencia del browser, React Native no tiene un origin de página contra
  // el que resolver una URL relativa: sin este prefijo, `/api/...` termina
  // pegándole al propio servidor de Metro en vez de a la API.
  const res = await fetch(API_BASE + url, { credentials: 'same-origin', ...init, headers: { ...headers, ...init?.headers } });
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

export interface Auth {
  sesion: Sesion | null;
  cargando: boolean;
  entrar: (usuario: string, password: string) => Promise<void>;
  salir: () => void;
}

/** Sesión de la app. La cookie es httpOnly, así que el cliente nunca ve el
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
  lastServiceDate: string;
  serviceCada: number;
  serviceUnidad: 'dias' | 'meses';
  seguroDate: string;
  seguroCosto: number;
  seguroPeriodo: 'mensual' | 'anual';
  seguroCada: number;
}

export interface NuevoPagoPayload {
  driver: string;
  carId: string | null;
  fecha: string;
  monto: number;
  tipo: 'pago' | 'ajuste';
  nota?: string;
}

export interface NuevoEgresoPayload {
  razon: string;
  monto: number;
  cat: string;
  comprobante: PickedFile | null;
}

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
  cargando: boolean;
  error: string;
  patchCar: (id: string, patch: Partial<Car>) => void;
  previewDriverCredentials: (id: string, driver: string) => Promise<DriverCredentials>;
  assignDriver: (id: string, payload: AssignDriverPayload) => Promise<Car>;
  addCar: (nuevo: NuevoCarPayload) => Promise<Car>;
  addPago: (nuevo: NuevoPagoPayload) => Promise<Pago>;
  addEgreso: (carId: string, datos: NuevoEgresoPayload) => Promise<Mov>;
  mandarATaller: (id: string, datos: { razon: string; monto: number; comprobante: PickedFile | null }) => Promise<void>;
}

/**
 * Estado de la flota respaldado por la API. `patchCar` se aplica primero en
 * memoria para que la interfaz responda al instante; el resto no, porque el
 * servidor decide algo (imputación de un pago, id del gasto) que no se puede
 * adivinar del lado del cliente.
 *
 * A propósito no incluye `deleteCar`/`deletePago`: ninguna pantalla de
 * admin-mobile los usa.
 */
export function useFleetStore(onError: (msg: string) => void, onSinSesion: () => void, enabled = true): FleetStore {
  const [cars, setCars] = useState<Car[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    const s = await req<{ cars: CarDto[]; movs: MovDto[]; pagos: PagoDto[] }>('/api/state');
    setCars(s.cars.map(toCar));
    setMovs(s.movs.map(toMov));
    setPagos(s.pagos.map(toPago));
  }, []);

  useEffect(() => {
    if (!enabled) {
      // App monta este hook también mientras muestra Login. Limpiar acá evita
      // que otro usuario vea por un instante los datos de la sesión anterior;
      // cuando el login termina, `enabled` cambia y se hace la carga real.
      setCars([]);
      setMovs([]);
      setPagos([]);
      setError('');
      setCargando(true);
      return;
    }
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
  }, [enabled, recargar, onSinSesion]);

  const patchCar = useCallback(
    (id: string, patch: Partial<Car>) => {
      setCars((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      const dto: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) dto[k] = v instanceof Date ? isoDate(v) : v;
      req(`/api/cars/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }).catch((e: Error) => {
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

  // Un pago no se aplica en optimista: cuánto cancela de cada cuota lo decide
  // la imputación sobre el conjunto, así que hasta que el servidor no lo
  // confirma no hay forma de saber qué mostrar.
  const addPago = useCallback(async (nuevo: NuevoPagoPayload) => {
    const creado = toPago(await req<PagoDto>('/api/pagos', { method: 'POST', body: JSON.stringify(nuevo) }));
    setPagos((ps) => [creado, ...ps]);
    return creado;
  }, []);

  const addEgreso = useCallback(async (carId: string, datos: NuevoEgresoPayload) => {
    const fd = new FormData();
    fd.append('razon', datos.razon);
    fd.append('monto', String(datos.monto));
    fd.append('cat', datos.cat);
    // React Native no tiene `File`: un archivo elegido con expo-document-picker
    // se adjunta como este objeto {uri,name,type}, que el fetch de RN entiende
    // igual que un File real al armar el multipart.
    if (datos.comprobante) {
      fd.append('comprobante', { uri: datos.comprobante.uri, name: datos.comprobante.name, type: datos.comprobante.mimeType } as unknown as Blob);
    }
    const r = await req<{ mov: MovDto }>(`/api/cars/${carId}/egreso`, { method: 'POST', body: fd });
    const mov = toMov(r.mov);
    setMovs((ms) => [mov, ...ms]);
    return mov;
  }, []);

  // Mandar a taller cambia el estado y crea el gasto en la misma operación, así
  // que no puede aplicarse en optimista: se espera al servidor y se aplican las
  // dos cosas juntas o ninguna.
  const mandarATaller = useCallback(async (id: string, datos: { razon: string; monto: number; comprobante: PickedFile | null }) => {
    const fd = new FormData();
    fd.append('razon', datos.razon);
    fd.append('monto', String(datos.monto));
    if (datos.comprobante) {
      fd.append('comprobante', { uri: datos.comprobante.uri, name: datos.comprobante.name, type: datos.comprobante.mimeType } as unknown as Blob);
    }
    const r = await req<{ car: CarDto; mov: MovDto }>(`/api/cars/${id}/taller`, { method: 'POST', body: fd });
    setCars((cs) => cs.map((c) => (c.id === id ? toCar(r.car) : c)));
    setMovs((ms) => [toMov(r.mov), ...ms]);
  }, []);

  return {
    cars,
    movs,
    pagos,
    cargando,
    error,
    patchCar,
    previewDriverCredentials,
    assignDriver,
    addCar,
    addPago,
    addEgreso,
    mandarATaller,
  };
}
