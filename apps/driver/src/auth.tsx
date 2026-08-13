import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as api from './api';
import { startLocationSharing, stopLocationSharing, type LocationSharingStatus } from './location';
import { TOKEN_KEY } from './session';
import type { Me } from './types';

/** 30 minutos de inactividad cierran la sesión automáticamente. */
const TIMEOUT_MS = 30 * 60 * 1000;

interface AuthState {
  cargando: boolean;
  token: string | null;
  me: Me | null;
  locationStatus: LocationSharingStatus | 'inactive';
  activarUbicacion: () => Promise<LocationSharingStatus>;
  entrar: (usuario: string, password: string) => Promise<string | null>;
  salir: () => Promise<void>;
  sesionVencida: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationSharingStatus | 'inactive'>('inactive');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);

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

  /** Resetea el timer de inactividad. Se llama en cada interacción del usuario. */
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    resetTimer();
    timerRef.current = setTimeout(() => {
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      stopLocationSharing().catch(() => {});
      setToken(null);
      setMe(null);
      setLocationStatus('inactive');
    }, TIMEOUT_MS);
  }, [resetTimer]);

  /** Cuando la app vuelve del background, revisa si pasó más tiempo del timeout. */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/active/) && next.match(/background/)) {
        // App entró al background: guardamos el timestamp.
        resetTimer();
      }
      if (appState.current.match(/background/) && next.match(/active/)) {
        // App volvió al foreground: si pasaron >30 min, cerramos sesión.
        const last = SecureStore.getItemAsync('last_active').then((v) => (v ? Number(v) : 0));
        last.then((ts) => {
          if (ts && Date.now() - ts > TIMEOUT_MS) {
            SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
            stopLocationSharing().catch(() => {});
            setToken(null);
            setMe(null);
            setLocationStatus('inactive');
          } else {
            startTimer();
          }
        });
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [startTimer, resetTimer]);

  /** Guarda timestamp de última actividad cada vez que hay token. */
  useEffect(() => {
    if (!token) return;
    const writeTimestamp = () => SecureStore.setItemAsync('last_active', String(Date.now()));
    writeTimestamp();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') writeTimestamp();
    });
    return () => sub.remove();
  }, [token]);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(TOKEN_KEY);
      if (saved) {
        try {
          const m = await api.getMe(saved);
          setToken(saved);
          setMe(m);
          void activarUbicacion();
          startTimer();
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      }
      setCargando(false);
    })();
  }, [activarUbicacion, startTimer]);

  const entrar = useCallback(async (usuario: string, password: string) => {
    try {
      const r = await api.login(usuario, password);
      await SecureStore.setItemAsync(TOKEN_KEY, r.token);
      setToken(r.token);
      setMe({ driver: r.driver, cuota: r.cuota, car: r.car });
      void activarUbicacion();
      startTimer();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'No se pudo conectar al servidor';
    }
  }, [activarUbicacion, startTimer]);

  const salir = useCallback(async () => {
    resetTimer();
    if (token) await api.logout(token).catch(() => {});
    await stopLocationSharing().catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync('last_active');
    setToken(null);
    setMe(null);
    setLocationStatus('inactive');
  }, [token, resetTimer]);

  const sesionVencida = useCallback(() => {
    resetTimer();
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    SecureStore.deleteItemAsync('last_active').catch(() => {});
    stopLocationSharing().catch(() => {});
    setToken(null);
    setMe(null);
    setLocationStatus('inactive');
  }, [resetTimer]);

  const value = useMemo(() => ({ cargando, token, me, locationStatus, activarUbicacion, entrar, salir, sesionVencida }), [cargando, token, me, locationStatus, activarUbicacion, entrar, salir, sesionVencida]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
