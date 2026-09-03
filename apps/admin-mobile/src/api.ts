import { useCallback, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { API_BASE } from './config';
import type { Car, CarLocation, LocationHistory, Mov, Pago, PickedFile, Reporte, ReportStatus } from './types';

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

export const listarHistorialUbicacion = (carId: string) => req<LocationHistory[]>(`/api/locations/${encodeURIComponent(carId)}/history?limit=200`);

type JsonResponse = Pick<Response, 'ok' | 'status' | 'json'>;

function requestMultipart(url: string, init: RequestInit, authHeaders: Record<string, string>): Promise<JsonResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? 'GET', url);
    Object.entries({ ...authHeaders, ...((init.headers ?? {}) as Record<string, string>) }).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.onload = () => {
      const body = xhr.responseText;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: async () => (body ? JSON.parse(body) : null),
      });
    };
    xhr.onerror = () => reject(new Error('No se pudo enviar el archivo'));
    xhr.ontimeout = () => reject(new Error('Se agotó el tiempo al enviar el archivo'));
    xhr.send(init.body as XMLHttpRequestBodyInit);
  });
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  // El Content-Type solo va cuando hay cuerpo: si se anuncia JSON y el cuerpo
  // llega vacío (DELETE, logout), Fastify rechaza el pedido con un 400 antes de
  // que la ruta llegue a ejecutarse. Con FormData tampoco se declara: lo pone
  // el navegador, que es el único que sabe el separador que va a usar.
  const headers = init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined;
  // La sesión viaja como Bearer (token en SecureStore), no como cookie: las
  // cookies de React Native no sobreviven un reinicio de la app, y así el
  // token usa exactamente el mismo camino que el de la app del chofer.
  const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  // A diferencia del browser, React Native no tiene un origin de página contra
  // el que resolver una URL relativa: sin este prefijo, `/api/...` termina
  // pegándole al propio servidor de Metro en vez de a la API.
  const requestHeaders = { ...(headers ?? {}), ...authHeaders, ...((init?.headers ?? {}) as Record<string, string>) } as Record<string, string>;
  const isMultipart = !!init?.body && init.body instanceof FormData;
  const res = isMultipart
    ? await requestMultipart(API_BASE + url, init!, requestHeaders)
    : await fetch(API_BASE + url, { ...init, headers: requestHeaders });
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    const msg = (cuerpo as { error?: string } | null)?.error ?? `Error ${res.status}`;
    throw res.status === 401 ? new SinSesion(msg) : new Error(msg);
  }
  return res.json() as Promise<T>;
}

/** Token de sesión del dueño. Vive en memoria para los pedidos y en
 *  SecureStore para sobrevivir reinicios de la app. */
const TOKEN_KEY = 'miflota_admin_token';
const BIOMETRIC_KEY = 'miflota_admin_biometria';
let authToken: string | null = null;

export function getAuthHeaders(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function guardarToken(token: string | null): Promise<void> {
  authToken = token;
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Sin SecureStore (web/Expo Go viejo), la sesión simplemente no persiste
    // entre reinicios: no es motivo para romper el login.
  }
}

export interface Sesion {
  usuario: string;
  nombre: string;
}

export interface Auth {
  sesion: Sesion | null;
  cargando: boolean;
  entrar: (usuario: string, password: string) => Promise<void>;
  salir: () => Promise<void>;
  /** Cambia la contraseña del dueño. El servidor cierra las sesiones de los
   *  otros dispositivos; la actual queda activa. */
  cambiarPassword: (actual: string, nueva: string) => Promise<void>;
  reintentarBiometria: () => Promise<boolean>;
  biometriaBloqueada: boolean;
}

export function registerAdminPushToken(token: string, platform: string): Promise<{ ok: true }> {
  return req<{ ok: true }>('/api/push/admin/register', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}

export function unregisterAdminPushToken(token: string): Promise<{ ok: true }> {
  return req<{ ok: true }>('/api/push/admin/register', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}

export function persistPushToken(token: string): Promise<void> {
  return SecureStore.setItemAsync('miflota_admin_push_token', token);
}

export function readPersistedPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync('miflota_admin_push_token');
}

export function clearPersistedPushToken(): Promise<void> {
  return SecureStore.deleteItemAsync('miflota_admin_push_token');
}

/** Sesión de la app. El token viene del login (el server lo devuelve en el
 *  cuerpo además de la cookie), se guarda en SecureStore y viaja como Bearer.
 *  Al arrancar se intenta restaurar: si el token ya no sirve, cae al login. */
export function useAuth(): Auth {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [biometriaBloqueada, setBiometriaBloqueada] = useState(false);

  const pedirBiometria = useCallback(async (): Promise<boolean> => {
    const hardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
    const enrolled = hardware && (await LocalAuthentication.isEnrolledAsync().catch(() => false));
    if (!enrolled) return true;
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloquear MiFlota', fallbackLabel: 'Usar contraseña', disableDeviceFallback: false });
    return r.success;
  }, []);

  const validarToken = useCallback(async (token: string): Promise<boolean> => {
    authToken = token;
    const m = await req<{ autenticado: boolean; usuario?: string; nombre?: string }>('/api/me');
    if (!m.autenticado) return false;
    setSesion({ usuario: m.usuario!, nombre: m.nombre! });
    setBiometriaBloqueada(false);
    return true;
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const guardado = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (guardado) authToken = guardado;
      const bio = (await SecureStore.getItemAsync(BIOMETRIC_KEY).catch(() => null)) === '1';
      try {
        if (!vivo) return;
        if (guardado && bio && !(await pedirBiometria())) {
          setBiometriaBloqueada(true);
          return;
        }
        if (guardado && !(await validarToken(guardado))) await guardarToken(null);
      } catch {
        if (vivo) {
          await guardarToken(null);
          setSesion(null);
        }
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [pedirBiometria, validarToken]);

  const entrar = useCallback(async (usuario: string, password: string) => {
    // La cookie que el server también manda es irrelevante acá: la sesión de
    // esta app va por Bearer.
    const r = await req<Sesion & { token?: string }>('/api/login', { method: 'POST', body: JSON.stringify({ usuario, password }) });
    if (!r.token) throw new Error('El servidor no devolvió token de sesión');
    await guardarToken(r.token);
    const hardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
    const enrolled = hardware && (await LocalAuthentication.isEnrolledAsync().catch(() => false));
    if (enrolled) await SecureStore.setItemAsync(BIOMETRIC_KEY, '1').catch(() => {});
    setSesion({ usuario: r.usuario, nombre: r.nombre });
  }, []);

  const reintentarBiometria = useCallback(async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    if (!token || !(await pedirBiometria())) return false;
    try {
      return await validarToken(token);
    } catch {
      await guardarToken(null);
      return false;
    }
  }, [pedirBiometria, validarToken]);

  const salir = useCallback(async () => {
    const pushToken = await readPersistedPushToken();
    if (pushToken) {
      await unregisterAdminPushToken(pushToken).catch(() => {});
      await clearPersistedPushToken().catch(() => {});
    }
    // Logout con el bearer puesto para que el server borre ESTA sesión; recién
    // después se limpia el token local.
    await req('/api/logout', { method: 'POST' }).catch(() => {});
    await guardarToken(null);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY).catch(() => {});
    setSesion(null);
  }, []);

  const cambiarPassword = useCallback(async (actual: string, nueva: string) => {
    await req<{ ok: true }>('/api/me/password', { method: 'POST', body: JSON.stringify({ actual, nueva }) });
  }, []);

  return { sesion, cargando, entrar, salir, cambiarPassword, reintentarBiometria, biometriaBloqueada };
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

export interface NuevoEgresoPayload {
  razon: string;
  monto: number;
  cat: string;
  comprobante: PickedFile | null;
  items?: { nombre: string; cantidad: number; costoUnitario: number; subtotal: number }[];
  manoObra?: number;
}

export interface AssistantHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export type AssistantAction =
  | { kind: 'car'; carId: string; label: string }
  | { kind: 'query'; question: string; label: string };

export interface AssistantCard {
  kind: 'driver' | 'car' | 'metric';
  title: string;
  value: string;
  subtitle?: string;
  action?: AssistantAction;
}

export interface AssistantTable {
  columns: { key: string; label: string }[];
  rows: { id: string; cells: Record<string, string>; action?: AssistantAction }[];
}

export interface AssistantChart {
  kind: 'bars';
  title: string;
  items: { label: string; value: number; displayValue: string; subtitle?: string }[];
}

export interface AssistantFilter {
  label: string;
  question: string;
}

export interface AssistantFollowUp {
  label: string;
  question: string;
}

export interface AssistantReply {
  answer: string;
  cards: AssistantCard[];
  chart?: AssistantChart;
  table?: AssistantTable;
  followUps?: AssistantFollowUp[];
  /** Compatibilidad temporal con respuestas de servidores anteriores. */
  filters?: AssistantFilter[];
  asOf: string;
  mode: 'local' | 'openrouter' | 'fallback';
  notice?: string;
  files?: { name: string; url: string; mimeType: string }[];
}

export type ReportPeriodType = 'semana' | 'mes' | 'jul' | 'd90' | 'custom';
export type ReportInclude = 'gastos' | 'ingresos' | 'ambos';
export type ReportSelection = 'todos' | string[];
export type ReportCategorySelection = 'todas' | string[];

export interface ReportExportPayload {
  period: { type: ReportPeriodType; from: string; to: string };
  include: ReportInclude;
  carIds: ReportSelection;
  categories?: ReportCategorySelection;
  format: 'pdf' | 'xlsx';
}

export interface ReportExportResponse {
  file: { name: string; url: string; mimeType: string };
  counts: { ingresos: number; gastos: number; total: number };
}

/** La pregunta viaja al backend autenticado. La clave y el acceso a los datos
 * permanecen siempre en el servidor; el bundle de Expo no contiene ninguno. */
export function askAssistant(question: string, history: AssistantHistoryItem[]): Promise<AssistantReply> {
  return req<AssistantReply>('/api/assistant/query', {
    method: 'POST',
    body: JSON.stringify({ question, history: history.slice(-6) }),
  });
}

export function exportFleetReport(payload: ReportExportPayload): Promise<ReportExportResponse> {
  return req<ReportExportResponse>('/api/reports/export', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
  reportes: Reporte[];
  locations: CarLocation[];
  cargando: boolean;
  refrescando: boolean;
  error: string;
  refresh: () => Promise<void>;
  patchCar: (id: string, patch: Partial<Car>) => void;
  previewDriverCredentials: (id: string, driver: string) => Promise<DriverCredentials>;
  assignDriver: (id: string, payload: AssignDriverPayload) => Promise<Car>;
  addCar: (nuevo: NuevoCarPayload) => Promise<Car>;
  addPago: (nuevo: NuevoPagoPayload) => Promise<Pago>;
  addEgreso: (carId: string, datos: NuevoEgresoPayload) => Promise<Mov>;
  mandarATaller: (id: string, datos: { razon: string; monto: number; comprobante: PickedFile | null; reportId?: number | null }) => Promise<void>;
  updateReporte: (id: number, estado: Extract<ReportStatus, 'en_taller' | 'resuelta'>) => Promise<Reporte>;
  exportReport: (payload: ReportExportPayload) => Promise<ReportExportResponse>;
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
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [locations, setLocations] = useState<CarLocation[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState('');
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshGeneration = useRef(0);

  const refresh = useCallback((): Promise<void> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const generation = refreshGeneration.current;

    const promise = (async () => {
      setRefrescando(true);
      try {
        const [s, l] = await Promise.all([
          req<{ cars: CarDto[]; movs: MovDto[]; pagos: PagoDto[]; reportes?: Reporte[] }>('/api/state'),
          req<CarLocation[]>('/api/locations'),
        ]);
        // Una respuesta de una sesión anterior no puede repoblar el store
        // después de cerrar sesión o cambiar de usuario.
        if (generation !== refreshGeneration.current) return;
        setCars(s.cars.map(toCar));
        setMovs(s.movs.map(toMov));
        setPagos(s.pagos.map(toPago));
        setReportes(s.reportes ?? []);
        setLocations(l);
        setError('');
      } catch (e) {
        if (e instanceof SinSesion) onSinSesion();
        setError(e instanceof Error ? e.message : 'No se pudieron actualizar los datos');
        throw e;
      } finally {
        if (generation === refreshGeneration.current) {
          setRefrescando(false);
          refreshInFlight.current = null;
        }
      }
    })();

    refreshInFlight.current = promise;
    return promise;
  }, [onSinSesion]);

  useEffect(() => {
    if (!enabled) {
      // App monta este hook también mientras muestra Login. Limpiar acá evita
      // que otro usuario vea por un instante los datos de la sesión anterior;
      // cuando el login termina, `enabled` cambia y se hace la carga real.
      setCars([]);
      setMovs([]);
      setPagos([]);
      setReportes([]);
      setLocations([]);
      setError('');
      setCargando(true);
      setRefrescando(false);
      refreshGeneration.current += 1;
      refreshInFlight.current = null;
      return;
    }
    let vivo = true;
    refresh()
      .then(() => vivo && setError(''))
      .catch((e: Error) => {
        if (vivo) setError(e.message);
      })
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      void refresh().catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, [enabled, refresh]);

  const patchCar = useCallback(
    (id: string, patch: Partial<Car>) => {
      setCars((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      const dto: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) dto[k] = v instanceof Date ? isoDate(v) : v;
      req(`/api/cars/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }).catch((e: Error) => {
        if (e instanceof SinSesion) return onSinSesion();
        onError('No se pudo guardar: ' + e.message);
        void refresh();
      });
    },
    [onError, onSinSesion, refresh],
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
    fd.append('manoObra', String(datos.manoObra ?? 0));
    fd.append('items', JSON.stringify(datos.items ?? []));
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
  const mandarATaller = useCallback(async (id: string, datos: { razon: string; monto: number; comprobante: PickedFile | null; reportId?: number | null }) => {
    const fd = new FormData();
    fd.append('razon', datos.razon);
    fd.append('monto', String(datos.monto));
    if (datos.reportId != null) fd.append('reportId', String(datos.reportId));
    if (datos.comprobante) {
      fd.append('comprobante', { uri: datos.comprobante.uri, name: datos.comprobante.name, type: datos.comprobante.mimeType } as unknown as Blob);
    }
    const r = await req<{ car: CarDto; mov?: MovDto; reporte?: Reporte }>(`/api/cars/${id}/taller`, { method: 'POST', body: fd });
    setCars((cs) => cs.map((c) => (c.id === id ? toCar(r.car) : c)));
    if (r.mov) setMovs((ms) => [toMov(r.mov!), ...ms]);
    if (r.reporte) setReportes((rs) => rs.map((reporte) => (reporte.id === r.reporte!.id ? r.reporte! : reporte)));
  }, []);

  const updateReporte = useCallback(async (id: number, estado: Extract<ReportStatus, 'en_taller' | 'resuelta'>) => {
    const reporte = await req<Reporte>(`/api/reportes/${id}`, { method: 'PATCH', body: JSON.stringify({ estado }) });
    setReportes((rs) => rs.map((r) => (r.id === id ? reporte : r)));
    return reporte;
  }, []);

  return {
    cars,
    movs,
    pagos,
    reportes,
    locations,
    cargando,
    refrescando,
    error,
    refresh,
    patchCar,
    previewDriverCredentials,
    assignDriver,
    addCar,
    addPago,
    addEgreso,
    mandarATaller,
    updateReporte,
    exportReport: exportFleetReport,
  };
}
