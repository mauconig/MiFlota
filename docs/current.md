# MiFlota — documentación vigente

Última revisión: 4 de septiembre de 2026.

Este documento describe el comportamiento actual. Los informes de auditoría
fechados del 13 de agosto de 2026 son snapshots históricos y no deben usarse
para determinar qué funcionalidades están disponibles hoy.

## Aplicaciones

- `apps/api`: Fastify + SQLite y fuente de verdad de propietarios, vehículos,
  cuotas, movimientos, pagos, comprobantes y ubicaciones.
- `apps/admin-web`: panel web del propietario.
- `apps/admin-mobile`: panel móvil del propietario.
- `apps/driver`: app nativa Expo del chofer.

Admin Web y Admin Mobile consultan la misma API y reciben únicamente datos del
propietario autenticado. Chofer usa una sesión bearer asociada a su vehículo.

## Deuda del chofer

`GET /api/chofer/resumen` calcula la deuda acumulada con todas las cuotas
vencidas hasta hoy. Los pagos y ajustes se imputan FIFO, desde la cuota más
antigua. Por eso una deuda de agosto continúa visible en septiembre.

`cobradoMes` y `diasPagados` representan únicamente el mes vigente y no
modifican el saldo acumulado. Los estados son `atrasado`, `al_dia` y
`adelantado` (con `aFavor`).

## Ubicación GPS

Al restaurar o iniciar una sesión de Chofer, y al volver al frente, se inicia
un único intento de adquisición:

1. Se comprueban servicios y permiso foreground.
2. Se guarda un intento con vencimiento de diez minutos.
3. Se pide inmediatamente una posición de alta precisión en foreground.
4. En paralelo se intenta habilitar el servicio Android de fondo.

Se acepta solamente una lectura nueva, no simulada y con precisión de hasta
50 metros. La posición aceptada actualiza una fila por vehículo en
`driver_locations` y se registra en `driver_location_history`. Si el permiso
de fondo no está disponible, se mantiene el reintento foreground durante el
plazo restante. Un mutex evita POST duplicados.

El intento se detiene y se elimina al aceptar una posición, al vencer el plazo,
al cerrar sesión o al perderla. Perfil muestra estados de permiso, GPS apagado
y error.

Endpoints relevantes:

- `POST /api/chofer/location`: requiere coordenadas válidas, `accuracy` de
  0–50, `recordedAt` y rechaza lecturas viejas o simuladas.
- `GET /api/locations`: última ubicación de los vehículos del propietario.
- `GET /api/locations/:carId/history?limit=200`: historial autorizado,
  ordenado por `received_at` descendente.

## Mapas

El detalle del vehículo muestra una tarjeta de ubicación con el botón
**Ver detalles**. El segundo modal contiene el mapa, la última posición,
marcadores históricos, fechas, precisión y **Abrir mapa completo**.

Leaflet usa tiles OpenStreetMap a través de
`/api/map/tiles/:z/:x/:y.png`. La API aplica identificación, timeout y caché
en `/data/map-tiles`; la atribución de OpenStreetMap debe permanecer visible.
Si el mapa falla, el historial textual continúa visible.

## Comprobantes

`GET /api/comprobantes/:id` sigue protegido por sesión. Chofer y Admin Mobile
descargan imágenes con Bearer al caché local mediante `expo-file-system` antes
de renderizarlas. Las descargas se reutilizan, muestran carga, permiten
reintento y rechazan respuestas HTTP no exitosas. Los PDF se mantienen como
documentos compartibles.

## Builds y verificación

```powershell
npm run build:api
npm run build:admin-web
npm --prefix apps/admin-mobile exec tsc --noEmit
npm --prefix apps/driver exec tsc --noEmit
npm --prefix apps/api test
```

Los APK release arm64 locales están en `apks/`. La instalación física requiere
que `adb devices` muestre un teléfono; GPS, permisos y notificaciones deben
validarse en un dispositivo real.

## Producción

Antes de modificar el servidor, respaldar la SQLite del volumen `/data`.
No publicar comprobantes ni tokens en URLs. Después de desplegar, revisar los
logs `driver location received` y `driver location rejected`.
