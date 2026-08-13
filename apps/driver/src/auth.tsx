import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as api from './api';
import { startLocationSharing, stopLocationSharing, type LocationSharingStatus } from './location';
import { TOKEN_KEY } from './session';
import type { Me } from './types';

interface AuthState {
  cargando: boolean;
  token: string | null;
  me: Me | null;
  locationStatus: LocationSharingStatus | 'inactive';
  activarUbicacion: () => Promise<LocationSharingStatus>;
  entrar: (usuario: string, password: string) => Promise<string | null>;
  salir: () => Promise<void>;
  /** Cuando una llamada devuelve 401 (sesión vencida o auto reasignado),
   *  la pantalla que la hizo llama esto en vez de manejarlo cada una por su cuenta. */
  sesionVencida: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationSharingStatus | 'inactive'>('inactive');

  const activarUbicacion = useCallback(async () => {
    try {
      const status = await startLocationSharing();
      setLocationStatus(status);
      return status;
    } catch {
      setLocationStatus('error');
      return 'error' as const;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(TOKEN_KEY);
      if (saved) {
        try {
          const m = await api.getMe(saved);
          setToken(saved);
          setMe(m);
          void activarUbicacion();
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      }
      setCargando(false);
    })();
  }, [activarUbicacion]);

  const entrar = useCallback(async (usuario: string, password: string) => {
    try {
      const r = await api.login(usuario, password);
      await SecureStore.setItemAsync(TOKEN_KEY, r.token);
      setToken(r.token);
      setMe({ driver: r.driver, cuota: r.cuota, car: r.car });
      void activarUbicacion();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'No se pudo conectar al servidor';
    }
  }, [activarUbicacion]);

  const salir = useCallback(async () => {
    if (token) await api.logout(token).catch(() => {});
    await stopLocationSharing().catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setMe(null);
    setLocationStatus('inactive');
  }, [token]);

  const sesionVencida = useCallback(() => {
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    stopLocationSharing().catch(() => {});
    setToken(null);
    setMe(null);
    setLocationStatus('inactive');
  }, []);

  const value = useMemo(() => ({ cargando, token, me, locationStatus, activarUbicacion, entrar, salir, sesionVencida }), [cargando, token, me, locationStatus, activarUbicacion, entrar, salir, sesionVencida]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
