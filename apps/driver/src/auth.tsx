import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as api from './api';
import { SinSesion } from './api';
import { startLocationSharing, stopLocationSharing, type LocationSharingStatus } from './location';
import { TOKEN_KEY } from './session';
import type { Me } from './types';

/** 30 minutos de inactividad cierran la sesión automáticamente. */
const TIMEOUT_MS = 30 * 60 * 1000;
const BIOMETRIC_KEY = 'miflota_driver_biometria';

interface AuthState {
  cargando: boolean;
  token: string | null;
  me: Me | null;
  locationStatus: LocationSharingStatus | 'inactive';
  activarUbicacion: () => Promise<LocationSharingStatus>;
  entrar: (usuario: string, password: string) => Promise<string | null>;
  salir: () => Promise<void>;
  sesionVencida: () => void;
  reintentarBiometria: () => Promise<boolean>;
  biometriaBloqueada: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationSharingStatus | 'inactive'>('inactive');
  const [biometriaBloqueada, setBiometriaBloqueada] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);

  const pedirBiometria = useCallback(async () => {
    const hardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
    const enrolled = hardware && (await LocalAuthentication.isEnrolledAsync().catch(() => false));
    if (!enrolled) return true;
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloquear MiFlota', fallbackLabel: 'Usar contraseña', disableDeviceFallback: false });
    return r.success;
  }, []);

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
      stopLocationSharing();
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
            stopLocationSharing();
            setToken(null);
            setMe(null);
            setLocationStatus('inactive');
          } else {
            startTimer();
            if (token) void activarUbicacion();
          }
        });
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [activarUbicacion, resetTimer, startTimer, token]);

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
      const bio = (await SecureStore.getItemAsync(BIOMETRIC_KEY).catch(() => null)) === '1';
      if (saved) {
        try {
          if (bio && !(await pedirBiometria())) {
            setBiometriaBloqueada(true);
            setCargando(false);
            return;
          }
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
  }, [activarUbicacion, pedirBiometria, startTimer]);

  const entrar = useCallback(async (usuario: string, password: string) => {
    try {
      const r = await api.login(usuario, password);
      await SecureStore.setItemAsync(TOKEN_KEY, r.token);
      const hardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = hardware && (await LocalAuthentication.isEnrolledAsync().catch(() => false));
      if (enrolled) await SecureStore.setItemAsync(BIOMETRIC_KEY, '1').catch(() => {});
      setToken(r.token);
      setMe({ driver: r.driver, cuota: r.cuota, kilometraje: r.kilometraje, kilometrajeActualizado: r.kilometrajeActualizado, car: r.car });
      void activarUbicacion();
      startTimer();
      return null;
    } catch (e) {
      // 401 = credenciales rechazadas (el server no devuelve detalle). Sin
      // este mensaje la pantalla de login navegaba igual y volvía al login
      // sin explicar nada.
      if (e instanceof SinSesion) return 'Usuario o contraseña incorrectos';
      return e instanceof Error ? e.message : 'No se pudo conectar al servidor';
    }
  }, [activarUbicacion, startTimer]);

  const reintentarBiometria = useCallback(async () => {
    const saved = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    if (!saved || !(await pedirBiometria())) return false;
    try {
      const m = await api.getMe(saved);
      setToken(saved);
      setMe(m);
      setBiometriaBloqueada(false);
      void activarUbicacion();
      startTimer();
      return true;
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      return false;
    }
  }, [activarUbicacion, pedirBiometria, startTimer]);

  const salir = useCallback(async () => {
    resetTimer();
    if (token) await api.logout(token).catch(() => {});
    await stopLocationSharing();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    await SecureStore.deleteItemAsync('last_active');
    setToken(null);
    setMe(null);
    setLocationStatus('inactive');
  }, [token, resetTimer]);

  const sesionVencida = useCallback(() => {
    resetTimer();
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    SecureStore.deleteItemAsync('last_active').catch(() => {});
    stopLocationSharing();
    setToken(null);
    setMe(null);
    setLocationStatus('inactive');
  }, [resetTimer]);

  const value = useMemo(() => ({ cargando, token, me, locationStatus, activarUbicacion, entrar, salir, sesionVencida, reintentarBiometria, biometriaBloqueada }), [cargando, token, me, locationStatus, activarUbicacion, entrar, salir, sesionVencida, reintentarBiometria, biometriaBloqueada]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
