import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as api from './api';
import type { AdminNotificationRoute } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  return process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Solicita permiso, obtiene el Expo Push Token y lo asocia al dueño actual. */
export async function registerAdminPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fleet-events', {
      name: 'Novedades de la flota',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8A13A',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return;

  const configuredProjectId = projectId();
  // Expo Push requiere un proyecto EAS asociado en builds standalone. En un
  // APK local sin projectId no hay token válido que registrar, así que la app
  // sigue funcionando y espera a que se configure ese valor.
  if (!configuredProjectId) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: configuredProjectId })).data;
  if (!token) return;
  await api.registerAdminPushToken(token, Platform.OS);
  await api.persistPushToken(token);
}

/** Desregistra el dispositivo antes de cerrar sesión para evitar cruces entre dueños. */
export async function unregisterAdminPushNotifications(): Promise<void> {
  const token = await api.readPersistedPushToken();
  if (!token) return;
  await api.unregisterAdminPushToken(token).catch(() => {});
  await api.clearPersistedPushToken();
}

function routeFromResponse(response: Notifications.NotificationResponse): AdminNotificationRoute | null {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  if (data?.type === 'daily_alert_digest') return { kind: 'alerts' };
  if (data?.type !== 'driver_payment') return null;
  const carId = typeof data.carId === 'string' ? data.carId : '';
  const paymentId = Number(data.paymentId);
  if (!carId || !Number.isInteger(paymentId) || paymentId <= 0) return null;
  return { kind: 'payment', carId, paymentId };
}

/** Escucha notificaciones tocadas y también la que abrió una app cerrada. */
export function subscribeAdminNotificationResponses(onRoute: (route: AdminNotificationRoute) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  let active = true;
  let lastResponseId: string | null = null;
  const emit = (response: Notifications.NotificationResponse | null) => {
    if (!active || !response) return;
    const responseId = response.notification.request.identifier;
    if (responseId === lastResponseId) return;
    const route = routeFromResponse(response);
    if (!route) return;
    lastResponseId = responseId;
    onRoute(route);
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  };
  let subscription: Notifications.EventSubscription;
  try {
    subscription = Notifications.addNotificationResponseReceivedListener(emit);
    void Notifications.getLastNotificationResponseAsync().then(emit).catch(() => {});
  } catch {
    return () => {
      active = false;
    };
  }
  return () => {
    active = false;
    subscription.remove();
  };
}
