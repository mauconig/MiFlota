import { useCallback, useEffect, useState } from 'react';
import type { Car, Mov } from './types';

/** Las fechas viajan como ISO `YYYY-MM-DD`. Se parsean a mediodía UTC para que
 *  ningún huso horario corra el día al construir el Date. */
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type CarDto = Omit<Car, 'lastServiceDate' | 'vtvDate' | 'seguroDate'> & { lastServiceDate: string; vtvDate: string; seguroDate: string };
type MovDto = Omit<Mov, 'date'> & { date: string };

const toCar = (c: CarDto): Car => ({ ...c, lastServiceDate: parseDate(c.lastServiceDate), vtvDate: parseDate(c.vtvDate), seguroDate: parseDate(c.seguroDate) });
const toMov = (m: MovDto): Mov => ({ ...m, date: parseDate(m.date) });

export class SinSesion extends Error {}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...init });
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
  driver: string;
  cuota: number;
  lastServiceDate: string;
  serviceCada: number;
  serviceUnidad: 'dias' | 'meses';
}

export interface FleetStore {
  cars: Car[];
  movs: Mov[];
  cargando: boolean;
  error: string;
  patchCar: (id: string, patch: Partial<Car>) => void;
  addCar: (nuevo: NuevoCarPayload) => Promise<Car>;
}

/**
 * Estado de la flota respaldado por la API. Las mutaciones se aplican primero en
 * memoria para que la interfaz responda al instante y se confirman contra el
 * servidor; si el servidor rechaza, se recarga el estado real y se informa.
 */
export function useFleetStore(onError: (msg: string) => void, onSinSesion: () => void): FleetStore {
  const [cars, setCars] = useState<Car[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    const s = await req<{ cars: CarDto[]; movs: MovDto[] }>('/api/state');
    setCars(s.cars.map(toCar));
    setMovs(s.movs.map(toMov));
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

  const addCar = useCallback(async (nuevo: NuevoCarPayload) => {
    const creado = toCar(await req<CarDto>('/api/cars', { method: 'POST', body: JSON.stringify(nuevo) }));
    setCars((cs) => [...cs, creado]);
    return creado;
  }, []);

  return { cars, movs, cargando, error, patchCar, addCar };
}
