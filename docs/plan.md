# Plan y estado de MiFlota

Última actualización: 26/08/2026

## Criterio de producto

MiFlota debe pedir una decisión por vez. Las pantallas móviles priorizan
preguntas simples, botones grandes, textos cotidianos y una acción principal
clara. Los datos detallados aparecen después de elegir el vehículo, período o
tipo de movimiento correspondiente.

## Estado actual

### Administración móvil

- ✅ Navegación principal: **Inicio**, **Vehículos**, **Registrar**, **Gastos** y
  **Más**.
- ✅ Ranking reemplazado por **Ganancia por vehículo** dentro de Inicio.
- ✅ Pantallas de Gastos, Alertas, Choferes y Reportes integradas a la
  navegación.
- ✅ Paginación en listas de vehículos, choferes, alertas, gastos, reportes,
  resultados de la IA y detalle de vehículo.
- ✅ Detalle de vehículo con edición de datos y selector entre Movimientos y
  Cuotas.
- ✅ Registro desde el botón `+` con elección de Ingreso o Egreso y flujo
  guiado.
- ✅ Egresos con selección de vehículo, categoría, descripción, repuestos,
  mano de obra, nota, comprobante opcional para el dueño y resumen previo.
- ✅ Se pueden agregar varios repuestos y el total se calcula como repuestos +
  mano de obra.
- ✅ Reportes paso a paso: contenido, vehículos, categorías, vista previa de
  datos y exportación a PDF o Excel.
- ✅ Las listas de selección de vehículos y categorías tienen scroll interno,
  sin mover toda la pantalla.
- ✅ Datos de service, seguro y kilometraje opcionales al crear un vehículo,
  con edición posterior desde el detalle.
- ✅ Íconos opacos y diferenciados para Admin Mobile y MiFlota Chofer.

### API y datos

- ✅ Reportes autenticados en PDF/XLSX con filtros server-side, aislamiento por
  dueño y nombres únicos con fecha y hora.
- ✅ PDF con resumen, tabla y diseño visual.
- ✅ Gastos detallados por ítem, cantidad, costo unitario, subtotal y mano de
  obra, manteniendo compatibilidad con gastos antiguos.
- ✅ Los cobros se calculan como dinero efectivamente cobrado, incluyendo
  cobros que todavía no fueron asociados a una cuota.
- ✅ Movimientos y cuotas se muestran como conceptos separados.
- ✅ Pagos registrados por el chofer: sólo transferencia y comprobante
  obligatorio. El dueño conserva sus medios de pago actuales.
- ✅ Identidad y sesiones in-house, con aislamiento por dueño y roles de dueño
  y chofer.
- ✅ IA conectada al proveedor configurado, con herramientas para consultar la
  flota y generar archivos descargables.

### MiFlota Chofer

- ✅ Actualización semanal de kilometraje.
- ✅ Recordatorios de kilometraje sin bloquear el uso de la app.
- ✅ Aviso al dueño cuando el kilometraje lleva siete días sin actualizarse.
- ✅ Biometría y pagos por transferencia implementados.

## Pendiente inmediato

1. **Validar definitivamente el teclado del chat en el teléfono conectado.**
   El código ya usa `KeyboardChatScrollView`, `KeyboardStickyView` sin offset
   fijo, medición dinámica del composer y oculta la barra inferior sólo mientras
   el teclado está abierto. Falta confirmar visualmente foco, escritura,
   multilinea, respuesta larga y apertura/cierre repetido en un teléfono viejo.
2. Revisar en el teléfono conectado las pantallas de Registrar, Gastos,
   Reportes y formularios largos con teclado abierto.
3. Corregir cualquier problema de textos, tamaños o desbordes detectado en la
   prueba de UI angosta.
4. Revisar la UI pendiente de Admin Web después de cerrar la validación móvil.
5. Generar las APK de Admin Mobile y MiFlota Chofer sólo después de validar la
   interfaz móvil en desarrollo.

## Criterios de validación

- El teclado nunca tapa el input activo ni deja una franja artificial.
- La barra inferior aparece con el teclado cerrado y desaparece sólo en
  MiFlota IA mientras se escribe.
- El botón físico Atrás conserva las respuestas del flujo y vuelve al paso
  anterior.
- Los filtros de reportes afectan tanto la vista previa como el PDF y el Excel.
- Los totales de gastos coinciden con repuestos más mano de obra.
- Las listas largas se pueden usar en pantalla angosta y teléfono antiguo.
- Cada dueño sólo ve sus propios vehículos, movimientos, gastos, cobros y
  reportes.
- No se genera una nueva APK hasta completar la validación visual en el
  teléfono.

## Historial reciente

- `494b0d4` — teclado móvil y ocultamiento contextual de la barra inferior.
- `3eab3e1` — separación de Movimientos y Cuotas.
- `1b2dda9` — paginación y selección múltiple de vehículos en Gastos.
- `e8c021e` — edición de datos del vehículo.
- `747e4b9` — reportes guiados desde móvil.
- `4073c79` — PDF visual y nombres únicos de exportación.
- `a1cd04f` — navegación simplificada y pantalla de Gastos.
