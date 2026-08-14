import * as Notifications from 'expo-notifications';

/** Configura el comportamiento de notificaciones locales. */
export async function configureNotifications() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
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

/** Programa un recordatorio diario de cuota. */
export async function scheduleDailyReminder(hora: number = 19, minuto: number = 0) {
  await Notifications.cancelScheduledNotificationAsync().catch(() => {});
  await Notifications.scheduleNotificationAsync({
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
}

/** Cancela todos los recordatorios programados. */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function formatGs(n: number): string {
  return '₲ ' + Math.round(n).toLocaleString('es-PY');
}
