# Notificaciones push del Admin Mobile

El backend envía notificaciones al dueño cuando un chofer:

- registra un pago desde `apps/driver`;
- envía una queja/reporte de falla.

Los tokens Expo Push se guardan en la tabla `admin_push_tokens`, asociados al
dueño autenticado. Al cerrar sesión, Admin Mobile los desregistra para no
enviar novedades de otra cuenta al mismo dispositivo.

## Configuración

Admin Mobile necesita un proyecto EAS para obtener un Expo Push Token en un APK
standalone. Completar en `apps/admin-mobile/.env`:

```dotenv
EXPO_PUBLIC_EAS_PROJECT_ID=<project-id-de-expo>
```

El backend puede desactivar los envíos sin tocar la app:

```dotenv
MIFLOTA_PUSH_ENABLED=false
```

El valor por defecto es habilitado.

## Notificaciones del dueño

La API ejecuta dentro del contenedor un scheduler que, a partir de las 08:00
de `America/Asuncion`, envía como máximo un resumen diario por dueño si hay
alertas pendientes de service, kilometraje, taller o seguro que vence ese día.
La marca de cada día se guarda en SQLite para no duplicar envíos después de un
reinicio. Si no hay alertas, no se envía nada.

Los pagos registrados desde la app del chofer siguen generando un push
inmediato con chofer, vehículo y monto. Al tocarlo, Admin Mobile abre el
vehículo y el detalle de ese pago; el resumen diario abre Alertas.

La zona se puede cambiar con `MIFLOTA_TIME_ZONE`, aunque la configuración
oficial de MiFlota es `America/Asuncion`.

Después de agregar o cambiar el `projectId`, hay que volver a compilar el APK:

```powershell
npx expo prebuild --platform android
./gradlew.bat assembleDebug --no-daemon
```

Las notificaciones no se pueden validar en un APK viejo porque el módulo nativo
queda incluido durante el prebuild.
