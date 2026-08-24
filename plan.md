# MiFlota — pendientes para mañana

## 1. APK de admin-mobile

- Retomar la development build Android con EAS.
- Mantener `expo-dev-client` en la versión compatible con Expo SDK 56 (`~56.0.24`).
- Verificar que `npm ci` y Gradle terminen correctamente.
- Descargar e instalar el APK en el teléfono conectado.
- Probar en el dispositivo real:
  - login y fallback con contraseña;
  - huella/biometría;
  - teclado en formularios y sheets;
  - ícono, splash y navegación;
  - alta y edición de datos opcionales del auto.
- No publicar ni actualizar el VPS como parte de esta tarea.

## 2. UI de admin-web — datos adicionales del auto

- Eliminar el uso de `window.prompt` para agregar datos del auto.
- Reemplazarlo por un modal/panel propio de la aplicación, visualmente consistente con MiFlota.
- El modal debe tener secciones claras y editables para:
  - último service y service cada;
  - datos del seguro;
  - kilometraje y fecha de actualización.
- Mantener esos datos opcionales al crear un auto.
- Desde el detalle del auto, mostrar un botón `Agregar datos` cuando falte información y permitir editarla cuando ya exista.
- Usar controles propios para guardar/cancelar y mensajes de validación dentro del modal.
- Revisar responsive en pantallas angostas y celulares antiguos:
  - títulos siempre horizontales;
  - columnas que puedan apilarse;
  - textos sin desbordamiento;
  - botones accesibles sin quedar ocultos.
- Revisar específicamente el caso mostrado: el diálogo oscuro del navegador que pide `Nombre del seguro` no debe volver a aparecer.
- Validar la vista en desktop y móvil antes de desplegarla.

## Estado al cerrar hoy

- La build EAS remota quedó cancelada.
- No se instaló ningún APK en el teléfono.
- La web/API siguen funcionando con la versión actualmente desplegada.
- El flujo de datos adicionales en admin-web funciona, pero necesita la UI propia indicada arriba.
