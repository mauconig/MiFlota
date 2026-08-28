import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KM_REMINDER_KEY = 'kilometraje_reminder_id';
const KM_PENDING_NOTICE_DAY_KEY = 'kilometraje_pending_notice_day';
const DAILY_REMINDER_KEY = 'daily_reminder_id';
const DRIVER_CHANNEL_ID = 'driver-events';
const DRIVER_NOTIFICATION_GROUP = 'miflota-driver-events';
const KM_REMINDER_HOUR = 19;
const KM_REMINDER_MINUTE = 0;

// Las cargas de Inicio pueden ocurrir en paralelo (focus, refresh y regreso
// del background). Serializar la sincronización evita programar dos avisos.
let kilometrajeSync: Promise<void> = Promise.resolve();
let dailyReminderSync: Promise<void> = Promise.resolve();

export async function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DRIVER_CHANNEL_ID, {
      name: 'Avisos de MiFlota',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8A13A',
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') await Notifications.requestPermissionsAsync();
}

/** Notifica al chofer que su pago fue registrado. */
export async function notifyPago(monto: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pago registrado',
      body: `Tu pago de ${formatGs(monto)} fue confirmado.`,
      sound: true,
      data: { notificationGroup: DRIVER_NOTIFICATION_GROUP, kind: 'pago' },
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
      data: { notificationGroup: DRIVER_NOTIFICATION_GROUP, kind: 'reporte' },
    },
    trigger: null,
  });
}

async function cancelStoredNotification(key: string): Promise<void> {
  const id = await SecureStore.getItemAsync(key);
  if (id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  await SecureStore.deleteItemAsync(key).catch(() => {});
}

function isDailyQuotaReminder(request: Notifications.NotificationRequest): boolean {
  const data = request.content.data;
  return (data?.notificationGroup === DRIVER_NOTIFICATION_GROUP && data?.kind === 'cuota') || request.content.title === 'Recordatorio de cuota';
}

/**
 * Limpia recordatorios de cuota creados por versiones anteriores y por
 * ejecuciones concurrentes. El ID de SecureStore no alcanza si una llamada
 * quedó a mitad de camino y su ID fue reemplazado por otra llamada.
 */
async function clearDailyQuotaReminders(): Promise<void> {
  const [scheduled, presented, storedId] = await Promise.all([
    Notifications.getAllScheduledNotificationsAsync().catch(() => [] as Notifications.NotificationRequest[]),
    Notifications.getPresentedNotificationsAsync().catch(() => [] as Notifications.Notification[]),
    SecureStore.getItemAsync(DAILY_REMINDER_KEY),
  ]);

  const scheduledIds = new Set(
    scheduled.filter(isDailyQuotaReminder).map((request) => request.identifier),
  );
  if (storedId) scheduledIds.add(storedId);
  await Promise.all([...scheduledIds].map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));

  const presentedIds = presented
    .filter((notification) => isDailyQuotaReminder(notification.request))
    .map((notification) => notification.request.identifier);
  await Promise.all(presentedIds.map((id) => Notifications.dismissNotificationAsync(id).catch(() => {})));
  await SecureStore.deleteItemAsync(DAILY_REMINDER_KEY).catch(() => {});
}

function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function updatedToday(updatedAt: string | null | undefined, now = new Date()): boolean {
  if (!updatedAt) return false;
  const parsed = new Date(`${updatedAt.slice(0, 10)}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && localDay(parsed) === localDay(now);
}

function nextKilometrajeReminder(now = new Date(), skipToday = false): Date {
  const reminder = new Date(now);
  reminder.setHours(KM_REMINDER_HOUR, KM_REMINDER_MINUTE, 0, 0);
  if (skipToday || reminder <= now) reminder.setDate(reminder.getDate() + 1);
  return reminder;
}

async function scheduleKilometrajeReminderNow(now = new Date(), skipToday = false): Promise<void> {
  await cancelStoredNotification(KM_REMINDER_KEY);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Actualizá el kilometraje',
      body: 'Recordá informar el kilometraje de tu auto hoy.',
      sound: true,
      data: { notificationGroup: DRIVER_NOTIFICATION_GROUP, kind: 'kilometraje' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextKilometrajeReminder(now, skipToday),
      channelId: DRIVER_CHANNEL_ID,
    },
  });
  await SecureStore.setItemAsync(KM_REMINDER_KEY, id);
}

async function notifyKilometrajePendienteNow(now = new Date()): Promise<void> {
  const day = localDay(now);
  const previousDay = await SecureStore.getItemAsync(KM_PENDING_NOTICE_DAY_KEY);
  if (previousDay === day) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Kilometraje pendiente',
      body: 'Actualizá el kilometraje de tu auto para mantener la flota al día.',
      sound: true,
      data: { notificationGroup: DRIVER_NOTIFICATION_GROUP, kind: 'kilometraje-atrasado' },
    },
    trigger: null,
  });
  await SecureStore.setItemAsync(KM_PENDING_NOTICE_DAY_KEY, day);
}

/** Sincroniza el único aviso diario con el estado del kilometraje. */
export function syncKilometrajeReminder(updatedAt: string | null | undefined, vencido: boolean): Promise<void> {
  kilometrajeSync = kilometrajeSync
    .catch(() => {})
    .then(async () => {
      const now = new Date();
      const actualizadoHoy = updatedToday(updatedAt, now);
      await scheduleKilometrajeReminderNow(now, actualizadoHoy);
      if (actualizadoHoy) await SecureStore.deleteItemAsync(KM_PENDING_NOTICE_DAY_KEY).catch(() => {});
      else if (vencido && now.getHours() >= KM_REMINDER_HOUR) await notifyKilometrajePendienteNow(now);
    });
  return kilometrajeSync;
}

/** Compatibilidad para llamadas existentes; el aviso se deduplica por día. */
export async function notifyKilometrajePendiente() {
  await notifyKilometrajePendienteNow();
}

/** Compatibilidad para llamadas existentes; ahora agenda el aviso diariamente. */
export async function scheduleKilometrajeReminder(updatedAt?: string | null) {
  await syncKilometrajeReminder(updatedAt, false);
}

/** Programa el recordatorio diario de cuota. */
export function scheduleDailyReminder(hora: number = 19, minuto: number = 0): Promise<void> {
  dailyReminderSync = dailyReminderSync
    .catch(() => {})
    .then(async () => {
      await clearDailyQuotaReminders();
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Recordatorio de cuota',
          body: 'Recordá pagar tu cuota diaria antes de finalizar la jornada.',
          sound: true,
          data: { notificationGroup: DRIVER_NOTIFICATION_GROUP, kind: 'cuota' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hora,
          minute: minuto,
          channelId: DRIVER_CHANNEL_ID,
        },
      });
      await SecureStore.setItemAsync(DAILY_REMINDER_KEY, id);
    });
  return dailyReminderSync;
}

/** Cancela recordatorios al cerrar sesión y limpia sus identificadores. */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await SecureStore.deleteItemAsync(KM_REMINDER_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(KM_PENDING_NOTICE_DAY_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(DAILY_REMINDER_KEY).catch(() => {});
}

function formatGs(n: number): string {
  return '₲ ' + Math.round(n).toLocaleString('es-PY');
}
