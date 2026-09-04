import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { API_BASE } from './config';
import { TOKEN_KEY } from './session';

export const LOCATION_TASK_NAME = 'miflota-driver-location';
export type LocationSharingStatus = 'active' | 'permission-required' | 'services-disabled' | 'unavailable' | 'error';

const MAX_ACCURACY_METERS = 50;
const RETRY_WINDOW_MS = 10 * 60 * 1000;
const ATTEMPT_STARTED_KEY = 'miflota_location_attempt_started';
const ATTEMPT_DEADLINE_KEY = 'miflota_location_attempt_deadline';

type LocationAttempt = { startedAt: number; deadline: number };
let startInFlight: Promise<LocationSharingStatus> | null = null;
let acceptInFlight: Promise<boolean> | null = null;
let foregroundRetrySubscription: Location.LocationSubscription | null = null;
let foregroundDeadlineTimer: ReturnType<typeof setTimeout> | null = null;

function stopForegroundRetry(): void {
  foregroundRetrySubscription?.remove();
  foregroundRetrySubscription = null;
  if (foregroundDeadlineTimer) clearTimeout(foregroundDeadlineTimer);
  foregroundDeadlineTimer = null;
}

function isGoodLocation(location: Location.LocationObject, startedAt: number): boolean {
  const accuracy = location.coords.accuracy;
  const timestamp = Number(location.timestamp);
  return (
    location.mocked !== true &&
    accuracy != null &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= MAX_ACCURACY_METERS &&
    Number.isFinite(timestamp) &&
    timestamp >= startedAt - 60_000
  );
}

async function sendLocation(token: string, location: Location.LocationObject): Promise<void> {
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

async function readAttempt(): Promise<LocationAttempt | null> {
  const [started, deadline] = await Promise.all([
    SecureStore.getItemAsync(ATTEMPT_STARTED_KEY),
    SecureStore.getItemAsync(ATTEMPT_DEADLINE_KEY),
  ]);
  const startedAt = Number(started);
  const deadlineAt = Number(deadline);
  return Number.isFinite(startedAt) && Number.isFinite(deadlineAt) ? { startedAt, deadline: deadlineAt } : null;
}

async function finishAttempt(): Promise<void> {
  stopForegroundRetry();
  await Promise.all([
    SecureStore.deleteItemAsync(ATTEMPT_STARTED_KEY),
    SecureStore.deleteItemAsync(ATTEMPT_DEADLINE_KEY),
  ]);
}

async function acceptLocation(location: Location.LocationObject, attempt: LocationAttempt, token: string): Promise<boolean> {
  if (acceptInFlight) return acceptInFlight;
  const job = (async () => {
    const current = await readAttempt();
    if (!current || current.startedAt !== attempt.startedAt) return false;
    if (!isGoodLocation(location, attempt.startedAt)) return false;
    await sendLocation(token, location);
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
    stopForegroundRetry();
    await finishAttempt();
    return true;
  })();
  acceptInFlight = job.finally(() => { acceptInFlight = null; });
  return acceptInFlight;
}

// Android can execute this task while the UI JavaScript tree is not mounted.
TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const attempt = await readAttempt();
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!attempt || !token) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
    return;
  }
  if (Date.now() >= attempt.deadline) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
    await finishAttempt();
    return;
  }

  const locations = data?.locations ?? [];
  // Android may deliver a batch. Try newest first and keep the service alive
  // when every fix is too imprecise or the network is temporarily unavailable.
  for (const location of [...locations].sort((a, b) => b.timestamp - a.timestamp)) {
    try {
      if (await acceptLocation(location, attempt, token)) return;
    } catch {
      return;
    }
  }
});

async function startLocationSharingOnce(): Promise<LocationSharingStatus> {
  if (!(await Location.hasServicesEnabledAsync())) return 'services-disabled';

  let foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    foreground = await Location.requestForegroundPermissionsAsync();
  }
  if (foreground.status !== Location.PermissionStatus.GRANTED) return 'permission-required';

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return 'error';

  await stopLocationSharing();
  const startedAt = Date.now();
  const attempt = { startedAt, deadline: startedAt + RETRY_WINDOW_MS };
  await SecureStore.setItemAsync(ATTEMPT_STARTED_KEY, String(attempt.startedAt));
  await SecureStore.setItemAsync(ATTEMPT_DEADLINE_KEY, String(attempt.deadline));
  foregroundDeadlineTimer = setTimeout(() => {
    stopForegroundRetry();
    void readAttempt().then((current) => current?.startedAt === attempt.startedAt ? finishAttempt() : undefined);
  }, RETRY_WINDOW_MS + 250);

  // La primera lectura no puede depender del permiso "todo el tiempo" ni de
  // TaskManager: el chofer debe compartir una posición aun si Android solo
  // concedió ubicación mientras usa la app.
  const immediate = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, mayShowUserSettingsDialog: true })
    .then((location) => acceptLocation(location, attempt, token))
    .catch(() => false);

  let background: 'started' | 'permission-required' | 'unavailable' | 'error' = 'unavailable';
  if (await TaskManager.isAvailableAsync().catch(() => false)) {
    try {
      let permission = await Location.getBackgroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        permission = await Location.requestBackgroundPermissionsAsync();
      }
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        background = 'permission-required';
      } else if (await readAttempt()) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5_000,
          distanceInterval: 0,
          deferredUpdatesInterval: 5_000,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'MiFlota comparte tu ubicación',
            notificationBody: 'Se está buscando una ubicación precisa del auto.',
            notificationColor: '#e8a13a',
            killServiceOnDestroy: true,
          },
        });
        background = 'started';
      }
    } catch {
      background = 'error';
    }
  }

  // Si no se pudo registrar el servicio de fondo (por permiso denegado o por
  // plataforma), seguimos solicitando lecturas en primer plano hasta el mismo
  // límite de diez minutos. La primera lectura y los reintentos comparten la
  // misma aceptación serializada, por lo que nunca se envía dos veces.
  if (background !== 'started' && await readAttempt()) {
    try {
      foregroundRetrySubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5_000, distanceInterval: 0 },
        (location) => { void acceptLocation(location, attempt, token); },
      );
    } catch {
      // El resultado se informa abajo; la lectura inmediata todavía puede
      // completar el intento si el GPS responde dentro del plazo.
    }
  }

  // No esperamos indefinidamente al GPS: el servicio sigue procesando lecturas
  // si la primera todavía no está disponible. Si la aceptó antes de terminar
  // el pedido de permiso de fondo, no volvemos a mostrar un estado erróneo.
  const immediateAccepted = await Promise.race([
    immediate,
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 15_000)),
  ]);
  if (immediateAccepted || !(await readAttempt())) return 'active';
  if (background === 'started') return 'active';
  if (background === 'permission-required') return 'permission-required';
  return background === 'error' ? 'error' : 'unavailable';
}

/** Starts one acquisition attempt. A successful fix stops the background task. */
export function startLocationSharing(): Promise<LocationSharingStatus> {
  if (!startInFlight) {
    startInFlight = startLocationSharingOnce().finally(() => { startInFlight = null; });
  }
  return startInFlight;
}

/** Stops the current acquisition attempt and removes its persisted deadline. */
export async function stopLocationSharing(): Promise<void> {
  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
  stopForegroundRetry();
  await finishAttempt().catch(() => {});
}
