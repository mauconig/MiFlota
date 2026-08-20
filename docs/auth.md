# Autenticación de MiFlota (in-house)

MiFlota usa un sistema de autenticación **100% in-house**: no hay Clerk ni ningún
proveedor de identidad externo en ninguno de los tres clientes ni en el API. Las
contraseñas y las sesiones viven en la base SQLite del API (`users`, `sessions`,
`chofer_sessions`) y nada se envía a terceros.

Hay dos identidades distintas, con contratos separados a propósito:

| Identidad | Clientes | Credencial | Sesión | Tablas |
|---|---|---|---|---|
| Dueño / admin | admin-web, admin-mobile | usuario + contraseña | Cookie `miflota_sesion` | `users`, `sessions` |
| Chofer | apps/driver | usuario + contraseña por auto | Bearer token opaco | `cars`, `chofer_sessions` |

## Contraseñas

- Hash **scrypt** con salt aleatorio de 16 bytes; el costo se guarda junto al
  hash (`scrypt$64$<salt>$<hash>`) para poder subirlo sin invalidar claves.
- Nunca se guarda ni se recupera la contraseña en texto plano.
- El primer dueño se crea al arrancar desde `MIFLOTA_ADMIN_USER/PASSWORD/NOMBRE`
  si la tabla `users` está vacía; la contraseña debe tener al menos 12 caracteres.
- Alta/reset de cuentas por CLI: `node dist/crear-usuario.js <usuario>
  [--nombre] [--password] [--reset] [--seed] [--adoptar]`. Resetear cierra todas
  las sesiones del usuario.
- Provisioning demo idempotente: `node dist/provision-demo.js` (verifica la
  cuenta admin con la password de entorno y sincroniza credenciales de choferes;
  no resetea la contraseña de una cuenta existente).

## Sesión del dueño (web + admin-mobile)

- `POST /api/login` valida la contraseña y emite un token opaco aleatorio
  (32 bytes base64url). Se guarda solo su **hash SHA-256** en `sessions`.
- El token viaja en la cookie `miflota_sesion` (httpOnly, `SameSite=lax`,
  `Secure` en producción), 30 días de vida.
- `/api/logout` borra la sesión; `/api/me` responde si sigue válida.
- El cliente nunca ve el token: la cookie es httpOnly. admin-web la maneja el
  navegador; admin-mobile usa `fetch` con `credentials: 'same-origin'` (el
  client HTTP de React Native) y pregunta por `/api/me` al arrancar.
- Toda ruta bajo `/api/*` exige sesión, salvo `/api/health`, `/api/login` y
  `/api/me` (`ABIERTAS`).

## Sesión del chofer (apps/driver)

- Credenciales **por vehículo**: columnas `driver_username` + `driver_pass_hash`
  en `cars`, generadas por el dueño con `POST /api/cars/:id/chofer-credenciales`
  (o su preview `.../preview` y la confirmación `.../asignar-chofer`).
- `POST /api/chofer/login` valida usuario+contraseña y emite un bearer token
  opaco de 32 bytes, guardado como hash SHA-256 en `chofer_sessions` (30 días).
- El token se guarda en **SecureStore** del celular. La app tiene un timeout
  de inactividad de 30 minutos del lado del cliente.
- Reasignar el chofer de un auto o regenerar credenciales cierra sus sesiones
  (`borrarSesionesDeCar`).
- El username de chofer es único en toda la base (el chofer no declara a qué
  flota pertenece al entrar).

## Controles

- **Rate limiting** del login: en memoria, 8 fallos por IP+identidad → bloqueo de
  10 minutos. Se aplica a `/api/login` y `/api/chofer/login`.
- **Respuestas uniformes**: el mensaje de credenciales inválidas es el mismo
  exista o no el usuario (no permite enumerar cuentas).
- **Multi-tenant**: toda consulta de flota lleva `owner_id` en el WHERE; un id
  de otro dueño responde 404 igual que uno inexistente.
- **Contraseñas de chofer generadas** sin caracteres confundibles (0/O, 1/l/I,
  5/S, 8/B).
- `/api/chofer/*` valida su propio Bearer con `quienChofer()`, que resuelve el
  `owner_id` y el `driver` en vivo contra `cars` en cada pedido (no desde una
  copia guardada al loguearse).

## Limitaciones conocidas

Estado del roadmap de `docs/plan.md` (solo documentación; no hay trabajo en curso):

- No hay tabla `drivers` ni identidad estable de chofer fuera del nombre.
- `users` no tiene roles explícitos ni estado de cuenta (`active`/`disabled`).
- No hay reset de contraseña por token (un solo uso, vencimiento corto); solo CLI.
- No hay caducidad por inactividad del lado del servidor (el timeout del chofer
  es del cliente).
- El rate limit es en memoria y se reinicia al reiniciar el proceso.
- No hay auditoría persistente de login/logout/reset/revocación.
- No hay gestión de sesiones por dispositivo ni revocación desde la UI.