# Historial de cambios

## 4 de septiembre de 2026

### Chofer

- El balance sigue acumulando cuotas históricas y aplica pagos FIFO desde la
  deuda más antigua.
- Se eliminó la tarjeta roja duplicada de atraso; el estado permanece en la
  tarjeta principal.
- La ubicación intenta una lectura foreground precisa al abrir/restaurar la
  sesión y reintenta hasta diez minutos si hace falta.
- La primera ubicación no depende del permiso de fondo. Los envíos se
  serializan y se detienen al aceptar, vencer, cerrar sesión o perderla.
- Las fotos de comprobantes se descargan con Bearer al caché local, con carga,
  reintento y validación de respuesta. Los PDF siguen siendo compartibles.

### API

- `driver_locations` conserva la última posición, una fila por vehículo.
- `driver_location_history` conserva hasta 30 días de lecturas aceptadas.
- `POST /api/chofer/location` exige precisión de hasta 50 m y rechaza lecturas
  inválidas, viejas o simuladas.
- `GET /api/locations/:carId/history` devuelve el historial filtrado por
  propietario.
- `/api/map/tiles/:z/:x/:y.png` funciona como proxy cacheado de OpenStreetMap.
- Se agregaron pruebas de regresión para deuda acumulada, FIFO, saldo a favor y
  aislamiento entre choferes.

### Administradores

- El primer detalle del vehículo muestra solo la tarjeta de ubicación.
- **Ver detalles** abre el modal secundario con mapa, última posición,
  marcadores históricos, fechas, precisión y enlace al mapa completo.
- Web y Mobile refrescan ubicaciones cada 30 segundos mientras el modal/panel
  está activo y conservan el historial textual si el mapa no carga.

## Fixture local histórico

El fixture de Mateo Rojas en `apps/api/.localdata/miflota.db` es únicamente para
pruebas locales. Su contraseña no se documenta en Git; regenerala con las
herramientas de administración si necesitás usarlo.

Para el comportamiento vigente, consultar [current.md](current.md).
