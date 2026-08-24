import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { API_BASE } from './config';
import { TOKEN_KEY } from './session';

export type LocationSharingStatus = 'active' | 'permission-required' | 'services-disabled' | 'unavailable' | 'error';

/** Cada cuánto se re-comparte la posición mientras la app está en primer plano. */
const HORARIO_MS = 60 * 60 * 1000;

/** Último envío exitoso, para saber si al volver del background hay que
 *  compartir de nuevo o todavía está fresco. */
let ultimoEnvio = 0;

let timer: ReturnType<typeof setInterval> | null = null;
let appStateSub: ReturnType<typeof AppState.addEventListener> | null = null;

async function sendLocation(token: string, location: Location.LocationObject) {
  const response = await fetch(`${API_BASE}/api/chofer/location`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      recordedAt: new Date(location.timestamp).toISOString(),
      mocked: location.mocked === true,
    }),
  });
  if (!response.ok) throw new Error(`location ${response.status}`);
}

/** Toma la posición actual y la manda al servidor una sola vez. Sin seguimiento
 *  continuo: el dueño ve la última posición conocida, que se refresca cada hora
 *  mientras la app esté abierta (ver `startHourlySharing`). */
export async function shareLocationOnce(): Promise<LocationSharingStatus> {
  if (!(await Location.hasServicesEnabledAsync())) return 'services-disabled';

  let foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    foreground = await Location.requestForegroundPermissionsAsync();
  }
  if (foreground.status !== Location.PermissionStatus.GRANTED) return 'permission-required';

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return 'error';

  try {
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await sendLocation(token, location);
    ultimoEnvio = Date.now();
    return 'active';
  } catch {
    return 'error';
  }
}

/** Comparte al momento y agenda un envío por hora mientras la app esté en
 *  primer plano. En background el timer se pausa (el intervalo no corre y no
 *  hay task de fondo); al volver, si pasó más de una hora desde el último
 *  envío, comparte de una vez y retoma el ciclo. */
export function startHourlySharing(): void {
  stopLocationSharing();
  void shareLocationOnce();
  timer = setInterval(() => void shareLocationOnce(), HORARIO_MS);
  appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active' && Date.now() - ultimoEnvio >= HORARIO_MS) {
      void shareLocationOnce();
    }
  });
}

/** Cancela el timer horario y el listener de AppState. */
export function stopLocationSharing(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  appStateSub?.remove();
  appStateSub = null;
}