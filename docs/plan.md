# MiFlota — pendientes activos

## 1. Kilometraje diario de los choferes — implementación completada

### Estado actual

- El dueño puede cargar o editar el kilometraje del vehículo.
- La app del chofer muestra el kilometraje actual y permite informar un nuevo valor.
- `POST /api/chofer/kilometraje` valida números enteros y rechaza valores menores al anterior.
- Cada actualización guarda `kilometraje_actualizado`.
- El servidor calcula si el kilometraje está atrasado.
- `kilometraje_alertas` evita repetir la alerta del dueño para el mismo vehículo y día.
- Admin-mobile muestra las alertas de kilometraje junto con service, seguro y taller.

### Cambios implementados

- El aviso del chofer dejó de ser semanal y ahora se agenda diariamente a las 19:00 hora local.
- Si el chofer todavía no actualizó el día actual, se agenda el aviso de esa jornada; si ya pasaron las 19:00, se agenda para el día siguiente.
- Si ya actualizó el kilometraje hoy, se cancela el aviso anterior y se programa únicamente el del día siguiente.
- Al volver a abrir, refrescar o enfocar la pantalla de Inicio, el aviso anterior se cancela antes de crear uno nuevo.
- Las sincronizaciones concurrentes se serializan para evitar que focus, refresh y background creen notificaciones duplicadas.
- El aviso de kilometraje atrasado se limita a una notificación inmediata por día mediante SecureStore.
- La falta de actualización no bloquea pagos, reportes ni navegación.
- Se mantienen la validación server-side, el aislamiento por dueño/vehículo y la regla de kilometraje no decreciente.

### Validación pendiente en dispositivo

- Confirmar el aviso diario con el teléfono antes y después de las 19:00.
- Actualizar el kilometraje y confirmar que el próximo aviso quede para el día siguiente.
- Abrir y refrescar Inicio varias veces y verificar que exista un solo aviso programado.
- Probar vehículo sin kilometraje inicial y kilometraje inicial igual a cero.
- Probar error de red, sesión vencida y kilometraje decreciente.
- Confirmar que un chofer sin vehículo no pueda consultar ni modificar un vehículo ajeno.
- Verificar la alerta al dueño después de siete días sin actualización.

## 2. Notificaciones de la app del chofer — implementación completada

### Cambios implementados

- La configuración de `expo-notifications` quedó centralizada en `apps/driver/src/notifications.ts`.
- Se creó el canal Android `driver-events` con nombre visible `Avisos de MiFlota`.
- Los eventos de pago, reporte, cuota y kilometraje incluyen metadatos de grupo y tipo para mantenerlos identificables.
- Los recordatorios programados guardan sus identificadores en SecureStore.
- Antes de programar un nuevo recordatorio se cancela el identificador anterior.
- El aviso de kilometraje atrasado se deduplica por fecha local.
- El layout raíz configura permisos y canal antes de programar el recordatorio diario de cuota.
- Al limpiar las notificaciones se limpian también los identificadores persistidos.
- Si el usuario rechaza permisos, la app continúa funcionando sin notificaciones.

### Validación pendiente en dispositivo

- Probar varios pagos y reportes consecutivos con la app abierta.
- Probar avisos con la app en segundo plano y cerrada.
- Confirmar que no se superpongan avisos ni se repita el mismo recordatorio.
- Revisar el comportamiento del canal en Android nuevo y teléfono antiguo.
- Verificar textos, sonido, banner y listado de notificaciones.
- Confirmar que los avisos de cuota y kilometraje no se cancelen entre sí.
- Revocar permisos y confirmar que pagos y reportes sigan funcionando.

## Validación técnica

- TypeScript de `apps/driver` pasa correctamente.
- Falta ejecutar el build/export de driver y API después de cerrar las pruebas visuales.
- Los cambios de `expo-notifications` requieren una nueva development build nativa para probarlos en un teléfono real.
- La validación se hizo con el development client y Metro; no fue necesario
  generar un APK nuevo para estos cambios visuales.

## 3. Sincronizacion de Admin Web y Admin Mobile - completada

### Estado actual

- Admin Web y Admin Mobile ya consultan la misma API HTTPS de la VPS:
  `https://miflota.147-93-180-120.sslip.io`.
- La base de datos oficial es la SQLite de la VPS; no se usa ninguna base local
  de `apps/api/.localdata` para el panel de administracion.
- Las bases de datos de Admin Web y Admin Mobile ya estan sincronizadas al
  compartir la misma fuente de verdad a traves de la API.
- Admin Mobile refresca vehiculos, movimientos, pagos y ubicaciones al iniciar
  sesion, al volver a primer plano y mediante el boton `Actualizar`.
- Las recargas se serializan para evitar pedidos concurrentes duplicados y los
  errores de red se muestran en la interfaz.
- El login movil usa el logo actualizado de MiFlota y permite mostrar u ocultar
  la contrasena con el icono de ojo dentro del campo.

### Validacion realizada

- La VPS responde correctamente en `/api/health`.
- Admin Web local se levanto en `http://localhost:5173/` y respondio HTTP 200.
- El development client de Admin Mobile cargo la configuracion y la pantalla de
  login desde Metro en el emulador Android.
- TypeScript de Admin Mobile pasa correctamente.
- No se realizaron altas, pagos ni modificaciones reales en produccion.

## Supuestos

- El horario predeterminado de kilometraje es 19:00 hora local.
- Los recordatorios son locales al teléfono del chofer; la alerta al dueño utiliza el sistema push existente.
- El servidor continúa siendo la fuente de verdad para kilometraje, atraso y aislamiento de datos.
- La notificación diaria no reemplaza el aviso visual dentro de la pantalla de Inicio.

## 4. Notificaciones push de Admin Mobile - implementación completada

### Cambios implementados

- La API ejecuta un scheduler dentro del proceso que envía a las 08:00 de
  `America/Asuncion` un único resumen diario por dueño cuando existen alertas
  pendientes de service, kilometraje, taller o seguro del día.
- La deduplicación se persiste en `admin_alert_digest_log`, por lo que un
  reinicio de la VPS no repite el resumen del mismo día.
- Si Expo falla, se libera la marca del día para que el scheduler pueda
  reintentar; si no hay alertas no se envía ninguna notificación.
- Los pagos de choferes mantienen el push inmediato e incluyen chofer,
  vehículo y monto.
- Al tocar el resumen se abre Alertas; al tocar un pago se abre el vehículo y
  el detalle del movimiento seleccionado.
- Admin Mobile procesa notificaciones con la app abierta, en segundo plano o
  cerrada. El cierre de sesión y la limpieza de tokens existentes se mantienen.
- La zona horaria se configura con `MIFLOTA_TIME_ZONE` y por defecto es
  `America/Asuncion`.

### Validación técnica

- Ejecutar TypeScript de API y Admin Mobile.
- Probar el scheduler con reloj simulado antes y después de las 08:00, sin
  alertas, con duplicación, fallo de Expo y reinicio de proceso.
- Validar en development build permisos, app cerrada, múltiples dispositivos,
  apertura de Alertas y apertura del detalle de pagos.

## 5. Pendientes

1. Implementar el desbloqueo por huella/telemetría en la app.
2. Mostrar en Alertas de Admin los reportes enviados desde la app de choferes,
   agrupados con la categoría `Reportes`.
