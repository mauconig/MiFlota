# Plan de estabilización y autenticación MiFlota

## Estado actual

- El APK Chofer tenía embebida la URL de un túnel Cloudflare vencido.
- Se recompiló e instaló Chofer con la URL estable de la VPS:
  `https://miflota.147-93-180-120.sslip.io`.
- La cuenta `admin` de la VPS tiene una contraseña distinta de la histórica
  documentada; no se debe resetear sin autorización explícita.
- Las credenciales demo de chofer fueron sincronizadas en la base persistente.
- Admin Mobile debe instalar también un APK recompilado con la URL estable.

## Objetivo

Reemplazar la autenticación actual por un sistema in-house único, predecible y
auditable para:

- MiFlota Web.
- MiFlota Admin Mobile.
- MiFlota Chofer.

La autenticación debe compartir identidad de dueño entre web y Admin Mobile,
pero mantener sesiones y permisos separados entre dueños y choferes.

## Diseño propuesto

### Identidades y roles

- Tabla `users` para dueños/administradores.
- Tabla `drivers` o identidad equivalente separada de los vehículos.
- Roles explícitos (`owner`, `admin`, `driver`) y estado de cuenta
  (`active`, `disabled`).
- Un chofer podrá cambiar de vehículo sin perder su identidad ni su historial.

### Contraseñas

- Hash con `scrypt` o Argon2id, siempre con salt aleatorio.
- Nunca guardar ni recuperar contraseñas en texto plano.
- Restablecimiento mediante token de un solo uso y vencimiento corto.
- Comandos demo separados para crear/resetear cuentas de prueba.

### Sesiones y tokens

- Sesiones opacas, aleatorias y revocables.
- Guardar únicamente hashes de tokens en la base.
- Expiración absoluta y expiración por inactividad.
- Revocación por dispositivo y cierre global de sesiones.
- Cookies `httpOnly`, `Secure` y `SameSite` para web.
- Tokens en SecureStore para las apps móviles.
- No mezclar cookies de dueño con bearer tokens de chofer.

### API

- Un contrato único de login/logout/me por tipo de identidad.
- Respuestas de error consistentes y sin revelar si existe un usuario.
- Rate limiting persistente por IP + identidad.
- Auditoría de login exitoso, fallido, logout, reset y revocación.
- Middleware central para autorización por usuario, rol y propietario de datos.

### Migración

1. Inventariar cuentas, sesiones y credenciales existentes en la VPS.
2. Crear tablas/columnas nuevas y migraciones reversibles.
3. Migrar usuarios admin conservando sus contraseñas mediante rehash al próximo
   login, sin imprimir ni recuperar la contraseña actual.
4. Migrar choferes desde credenciales por vehículo a identidades estables.
5. Mantener endpoints legacy temporalmente con respuestas de deprecación.
6. Cambiar web y ambas apps al contrato nuevo.
7. Revocar sesiones legacy después de validar los tres clientes.
8. Eliminar rutas y columnas legacy cuando no queden clientes antiguos.

## Datos demo y credenciales

- Mantener la flota determinista demo, pagos y reportes de prueba.
- Mantener `docs/credenciales/` únicamente para cuentas de aplicación demo.
- No guardar allí claves SSH, VPS, DeepSeek, tokens ni archivos `.env`.
- El provisionamiento demo debe ser idempotente y no borrar la base.

## Validación requerida

- Login/logout de dueño en web y Admin Mobile con la misma cuenta.
- Login/logout de chofer desde MiFlota Chofer.
- Cambio y reset de contraseña.
- Revocación de una sesión sin afectar las demás.
- Bloqueo temporal tras intentos fallidos.
- Verificación de aislamiento entre dueños y entre roles.
- Migración repetible sobre una copia de la base de la VPS.
- Pruebas API antes de actualizar los APKs.

## Próximos pasos

1. Terminar e instalar el APK actualizado de Admin Mobile.
2. Confirmar login de chofer con una cuenta demo desde el teléfono.
3. Resolver explícitamente la contraseña actual de `admin` en la VPS.
4. Diseñar y aprobar el esquema final de identidades y sesiones.
5. Implementar la migración in-house por etapas, empezando por API y pruebas.
