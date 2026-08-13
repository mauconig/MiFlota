import * as Location from 'expo-location';
import Constants, { AppOwnership } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { API_BASE } from './config';
import { TOKEN_KEY } from './session';

export const LOCATION_TASK_NAME = 'miflota-driver-location';

export type LocationSharingStatus = 'active' | 'permission-required' | 'services-disabled' | 'unavailable' | 'error';

type LocationTaskData = { locations: Location.LocationObject[] };

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

// Debe definirse en el scope global: Expo levanta este modulo sin montar la UI
// cuando Android entrega una actualizacion de ubicacion en segundo plano.
TaskManager.defineTask<LocationTaskData>(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const location = data.locations[data.locations.length - 1];
  if (!token || !location) return;
  await sendLocation(token, location).catch(() => {});
});

export async function startLocationSharing(): Promise<LocationSharingStatus> {
  if (Constants.appOwnership === AppOwnership.Expo) return 'unavailable';
  if (!(await Location.hasServicesEnabledAsync())) return 'services-disabled';

  let foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    foreground = await Location.requestForegroundPermissionsAsync();
  }
  if (foreground.status !== Location.PermissionStatus.GRANTED) return 'permission-required';

  let background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    background = await Location.requestBackgroundPermissionsAsync();
  }
  if (background.status !== Location.PermissionStatus.GRANTED) return 'permission-required';

  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!started) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 100,
      timeInterval: 60_000,
      deferredUpdatesDistance: 100,
      deferredUpdatesInterval: 60_000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'MiFlota comparte tu ubicación',
        notificationBody: 'El dueño puede ver la última posición de tu auto.',
        notificationColor: '#e8a13a',
      },
    });
  }
  return 'active';
}

export async function stopLocationSharing() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
