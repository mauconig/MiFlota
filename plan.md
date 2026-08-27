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

## 3. Kilometraje diario de los choferes

- El dueño podrá cargar el kilometraje inicial al crear o editar un vehículo.
- Después de esa carga, el chofer será responsable de actualizar el kilometraje todos los días.
- La app del chofer mostrará claramente el kilometraje actual y un campo para informar el nuevo valor.
- El nuevo valor deberá ser un número entero y no podrá ser menor al anterior.
- Cada actualización guardará automáticamente la fecha y hora del registro.
- El chofer recibirá una notificación diaria mientras no haya actualizado el kilometraje del día.
- Las notificaciones continuarán hasta que complete la actualización diaria.
- El dueño podrá ver qué vehículos fueron actualizados y cuáles están pendientes.
- Si el chofer acumula siete días sin actualizar, se enviará además una alerta al dueño.
- La falta de actualización no bloqueará la app ni impedirá registrar movimientos.

## 4. Selector de chofer en editar datos del vehiculo

- En `Editar datos` -> `Chofer`, `Nombre del chofer` debe ser un selector con los choferes disponibles, no un campo de texto libre.
- Al seleccionar un chofer se debe conservar el flujo de revision de usuario y contrasena correspondiente.

## 5. Notificaciones de la app del chofer

- Corregir las notificaciones apiladas de la app del chofer cuando aparecen varias a la vez.
- Revisar el contenedor, el espaciado y la duracion para que cada aviso sea legible y no se dibuje encima del anterior.
- Validar varias notificaciones consecutivas en telefonos nuevos y antiguos.

## 6. Unificar Cobros y Movimientos — realizado

- Eliminar la pagina o seccion independiente `Movimientos` de la web.
- Mantener una unica pagina de `Cobros` para consultar cobros y movimientos reales.
- Al entrar a `Cobros`, el tab principal y seleccionado por defecto será `Movimientos`.
- La jerarquía visible queda `Cobros` → `Cuotas` y `Cobros` → `Movimientos`, sin crear otro destino.
- Mantener una distincion clara dentro de la pagina entre cuotas/cobros y movimientos reales.
- Ajustar enlaces, menu, navegacion y botones que actualmente apuntan a `Movimientos` para que dirijan al destino unico.

## Estado al cerrar hoy

- La build EAS remota quedó cancelada.
- No se instaló ningún APK en el teléfono.
- La web/API siguen funcionando con la versión actualmente desplegada.
- El flujo de datos adicionales en admin-web funciona, pero necesita la UI propia indicada arriba.
- La página independiente `Movimientos` fue eliminada; `Cobros` queda como único destino.
