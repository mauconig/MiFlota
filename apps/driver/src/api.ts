import { API_BASE } from './config';
import type { Me, Pago, Reporte, Resumen, Urgencia } from './types';

export class SinSesion extends Error {}

async function req<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (r.status === 401) throw new SinSesion();
  const body = (await r.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  if (!r.ok) throw new Error(body.error || `Error ${r.status}`);
  return body as T;
}

export const login = (usuario: string, password: string) =>
  req<{ token: string; driver: string; cuota: number; kilometraje: number; kilometrajeActualizado: string | null; car: Me['car'] }>('/api/chofer/login', null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password }),
  });

export const logout = (token: string) => req<{ ok: true }>('/api/chofer/logout', token, { method: 'POST' });

export const getMe = (token: string) => req<Me>('/api/chofer/me', token);

export const postKilometraje = (token: string, kilometraje: number) =>
  req<{ ok: true; kilometraje: number; actualizado: string }>('/api/chofer/kilometraje', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kilometraje }),
  });

export interface DriverLocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
  mocked: boolean;
}

export const postLocation = (token: string, location: DriverLocationPayload) =>
  req<{ ok: true; recordedAt: string }>('/api/chofer/location', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location),
  });

export const getResumen = (token: string) => req<Resumen>('/api/chofer/resumen', token);

export const getPagos = (token: string, dias?: number) => req<Pago[]>(`/api/chofer/pagos${dias ? `?dias=${dias}` : ''}`, token);

export interface ComprobanteFile {
  uri: string;
  name: string;
  type: string;
}

export async function postPago(token: string, monto: number, medio: string, comprobante?: ComprobanteFile | null): Promise<Pago> {
  const fd = new FormData();
  fd.append('monto', String(monto));
  fd.append('medio', medio);
  if (comprobante) {
    // Expo's fetch does not accept RN's proprietary `{ uri, name, type }`
    // object when it serializes FormData. Read the local picker URI into a
    // real Blob first so the multipart encoder can serialize it correctly.
    const archivoResponse = await fetch(comprobante.uri);
    const archivoBlob = await archivoResponse.blob();
    const archivo = new Blob([archivoBlob], { type: comprobante.type || archivoBlob.type || 'application/octet-stream' });
    fd.append('comprobante', archivo, comprobante.name);
  }
  const r = await fetch(`${API_BASE}/api/chofer/pagos`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  if (r.status === 401) throw new SinSesion();
  const body = (await r.json().catch(() => ({}))) as { error?: string } & Pago;
  if (!r.ok) throw new Error(body.error || `Error ${r.status}`);
  return body;
}

export const getReportes = (token: string) => req<Reporte[]>('/api/chofer/reportes', token);

export const postReporte = (token: string, cat: string, urgencia: Urgencia, texto: string) =>
  req<Reporte>('/api/chofer/reportes', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cat, urgencia, texto }),
  });
