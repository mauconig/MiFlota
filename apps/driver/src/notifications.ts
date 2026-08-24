import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

const KM_REMINDER_KEY = 'kilometraje_reminder_id';
const DAILY_REMINDER_KEY = 'daily_reminder_id';

/** Configura el comportamiento de notificaciones locales. */
export async function configureNotifications() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Notifica al chofer que su pago fue registrado. */
export async function notifyPago(monto: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pago registrado',
      body: `Tu pago de ${formatGs(monto)} fue confirmado.`,
      sound: true,
    },
    trigger: null,
  });
}

/** Notifica al chofer que su reporte fue enviado. */
export async function notifyReporte(cat: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Reporte enviado',
      body: `Tu reporte de "${cat}" fue registrado.`,
      sound: true,
    },
    trigger: null,
  });
}

export async function scheduleKilometrajeReminder() {
  const previous = await SecureStore.getItemAsync(KM_REMINDER_KEY);
  if (previous) await Notifications.cancelScheduledNotificationAsync(previous).catch(() => {});
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Actualizá el kilometraje',
      body: 'Recordá informar el kilometraje de tu auto esta semana.',
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 7 * 86400000) },
  });
  await SecureStore.setItemAsync(KM_REMINDER_KEY, id);
}

export async function notifyKilometrajePendiente() {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Kilometraje pendiente', body: 'Actualizá el kilometraje de tu auto para mantener la flota al día.', sound: true },
    trigger: null,
  });
}

/** Programa un recordatorio diario de cuota. */
export async function scheduleDailyReminder(hora: number = 19, minuto: number = 0) {
  const previous = await SecureStore.getItemAsync(DAILY_REMINDER_KEY);
  if (previous) await Notifications.cancelScheduledNotificationAsync(previous).catch(() => {});
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recordatorio de cuota',
      body: 'Recordá pagar tu cuota diaria antes de finalizar la jornada.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hora,
      minute: minuto,
    },
  });
  await SecureStore.setItemAsync(DAILY_REMINDER_KEY, id);
}

/** Cancela todos los recordatorios programados. */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function formatGs(n: number): string {
  return '₲ ' + Math.round(n).toLocaleString('es-PY');
}
