# Estado de la autenticación MiFlota

> **El auth de MiFlota ya es 100% in-house** (sin Clerk ni IdP externo). La
> implementación real está documentada en [docs/auth.md](./auth.md). Este
> documento quedó como tracker del diseño y de lo que falta.

## Estado

- La autenticación in-house está implementada y desplegada en la VPS (cookie de
  sesión para el dueño, bearer token para el chofer, scrypt, tokens hasheados).
- No hay Clerk en ningún cliente ni en el API (verificado en código e historial).

## Diseño y cobertura actual

### Identidades y roles

- ✅ Tabla `users` para dueños/administradores.
- ⏳ Tabla `drivers` o identidad estable separada de los vehículos (hoy el
  chofer es un string en `cars`; la deuda lo sigue por snapshot del nombre).
- ⏳ Roles explícitos (`owner`, `admin`, `driver`) y estado de cuenta
  (`active`, `disabled`).
- ⏳ Un chofer podrá cambiar de vehículo sin perder su identidad ni su historial.

### Contraseñas

- ✅ Hash con `scrypt` con salt aleatorio; nunca se guarda ni recupera en claro.
- ⏳ Restablecimiento mediante token de un solo uso y vencimiento corto (hoy
  solo por CLI con `crear-usuario.js --reset`).
- ✅ Comandos demo para crear/resetear cuentas (`crear-usuario.js`,
  `provision-demo.js`).

### Sesiones y tokens

- ✅ Sesiones opacas, aleatorias y revocables; solo hashes en la base.
- ✅ Expiración absoluta (30 días); ⏳ expiración por inactividad server-side
  (el timeout de 30 min del chofer es del cliente).
- ⏳ Revocación por dispositivo desde la UI (hoy: logout puntual, y reset de
  password o reasignación de chofer cierran sus sesiones).
- ✅ Cookies `httpOnly`, `SameSite` y `Secure` en producción.
- ✅ Token del chofer en SecureStore; ⏳ la sesión del dueño en admin-mobile
  depende de la cookie del fetch de RN (no hay token propio en SecureStore).
- ✅ Cookies de dueño y bearer de chofer nunca se mezclan.

### API

- ✅ Un contrato único de login/logout/me por tipo de identidad.
- ✅ Respuestas de error consistentes, sin revelar si existe el usuario.
- ⏳ Rate limiting persistente por IP + identidad (hoy es en memoria).
- ⏳ Auditoría de login exitoso, fallido, logout, reset y revocación.
- ✅ Middleware central de sesión + owner-scoping en todas las consultas.

### Migración

- ✅ Se inventariaron cuentas/sesiones de la VPS; las credenciales demo quedaron
  sincronizadas en la base persistente.
- ⏳ Migrar choferes desde credenciales por vehículo a identidades estables.

## Validación realizada

- ✅ Login/logout de dueño en web y Admin Mobile (prueba de interoperabilidad
  contra la VPS, 15/15 pasos).
- ✅ Login/logout de chofer desde MiFlota Chofer.
- ✅ Cambio/reset de contraseña por CLI.
- ✅ Bloqueo temporal tras intentos fallidos (rate limit de login).
- ✅ Aislamiento entre dueños y entre roles (owner-scoping, bearer de chofer
  rechazado en rutas de dueño).

## Pendiente (solo si se decide retomar)

1. Identidad estable de chofer (tabla `drivers`) + roles/estado en `users`.
2. Reset de contraseña por token con vencimiento corto.
3. Caducidad por inactividad y rate limit persistente en el servidor.
4. Auditoría de auth.
5. Gestión/revocación de sesiones por dispositivo desde la UI.
6. Sesión del dueño de admin-mobile persistida en SecureStore.
