# MiFlota — Project Overview

Fleet management app (Spanish-language UI, Paraguayan guaraní ₲ amounts). Monorepo with
3 frontends + 1 Fastify/SQLite backend.

## Monorepo layout

| Path | What it is | npm workspace? |
|---|---|---|
| `apps/admin-web` | Desktop admin panel for the owner (React 19 + TS + Vite 8). The only app with complete screens. | Yes |
| `apps/admin-mobile` | Expo/React Native app for the owner's phone (Expo SDK 56). | **No** — has own `node_modules`/lockfile |
| `apps/driver` | Native Expo app for drivers (view debt, register payments with comprobante, report fallas). Expo SDK 56. | **No** — has own `node_modules`/lockfile (was a workspace; hoisting broke Metro/babel) |
| `apps/api` | Shared Fastify 5 + better-sqlite3 backend. | **No** — native dep (`better-sqlite3`), own `node_modules`/lockfile |

Root scripts: `npm run dev:api` (:3000), `npm run dev` / `dev:admin-web` (:5173),
`npm run dev:admin-mobile` (Expo/Metro :8081), `npm run dev:driver` (Expo/Metro :8082).
Note: `dev:api` only runs `tsc --watch` — the server itself is started separately with
`node dist/index.js` and the admin env vars from `apps/api/.env` loaded into the process.
Web frontends proxy `/api` → `127.0.0.1:3000`; there is **no CORS plugin** — dev uses
proxies, production is same-origin (Fastify serves the built SPA). Lint: `oxlint`.

## Backend — `apps/api`

Entry `src/index.ts` (~555 lines) + `db.ts`, `auth.ts`, `seed.ts`, `crear-usuario.ts`.
Plugins: `@fastify/cookie`, `@fastify/multipart` (8 MB limit, comprobante uploads),
`@fastify/static` (serves built SPA with fallback). Runs `tsc` then `node dist/index.js`.

**Auth** (`src/auth.ts`): session cookie `miflota_sesion` (httpOnly, 30 days, SHA-256-hashed
token stored), scrypt passwords, 8-failures-per-IP+user → 10-min lockout. All `/api/*`
routes require a session except `/api/health`, `/api/login`, `/api/me`. First user is
created on boot from `MIFLOTA_ADMIN_USER/PASSWORD/NOMBRE`; more users via
`node dist/crear-usuario.js <usuario> [--seed] [--reset] [--adoptar]` CLI.
Documentación completa del auth in-house (sin Clerk) en `docs/auth.md`.

**Endpoints** (all under `/api`, session-gated):

- `GET /health` (open), `POST /login` (open), `POST /logout`, `GET /me` (open)
- `GET /state` — single fetch: `{cars, movs, pagos}` for the session's owner
- `POST /cars`, `PATCH /cars/:id` (whitelisted fields; "sin chofer ⇒ cuota 0" enforced),
  `DELETE /cars/:id` (movs cascade, comprobante files removed)
- `POST /cars/:id/taller` — multipart: egreso mov (cat Taller) + `estado='taller'`, atomically
- `POST /cars/:id/egreso` — multipart: generic expense (6 categories) + optional comprobante
- `GET /comprobantes/:id` — streams attachment (owner-scoped, whitelist Content-Type, CSP sandbox)
- `POST /pagos` — `{driver, carId?, fecha?, monto, tipo: pago|ajuste, medio?, nota}`;
  `DELETE /pagos/:id` (payments are never edited — delete + recreate)

**DB** (`src/db.ts`, better-sqlite3, WAL, FKs on, `/data/miflota.db` via `MIFLOTA_DB`):

- `cars` — id, owner_id, plate, model, year, driver (string, `'Sin chofer'` default),
  cuota (daily ₲ fee), estado (`activo|taller|baja`), gps_tag, service schedule
  (`service_cada` + `service_unidad` + `last_service_date`), insurance
  (`seguro_date/costo/periodo/cada`)
- `movs` — movements: `ingreso` (issued cuota charge) / `egreso` (expense with `cat`),
  amount always **facturado**, optional `driver` snapshot, optional comprobante
  (file on disk + 3 metadata cols), `car_id` FK `ON DELETE CASCADE`
- `pagos` — money from a **driver** (`car_id` reference-only, `ON DELETE SET NULL`),
  `tipo pago|ajuste` (ajuste = condonación, excluded from revenue)
- `users`, `sessions`, `meta` (one-shot migration flags)

Migrations are hand-rolled in `openDb()` (PRAGMA column-presence guards; `meta`-flagged
one-shot `cobrado` → `pagos` ledger migration in an immediate transaction).
**Multi-tenancy**: every fleet row has `owner_id`; all queries are owner-scoped;
cross-owner ids answer 404.

**Seed** (`src/seed.ts`): deterministic demo fleet (mulberry32 seed 7, `SEED_TODAY =
2026-08-28`): 15 vehicles, 14 drivers, ~90 days of cuota ingresos + random egresos.
Both frontends hardcode the same `TODAY`; `MIFLOTA_HOY` aligns the server in dev.

## Frontend — `apps/admin-web` (desktop)

React 19.2 + Vite 8 + TS, **no router, no state library, no CSS framework** — inline
style objects + tokens (`src/styles.ts`, `src/format.ts#COLORS`), Plus Jakarta Sans.
Only runtime dep besides React: `xlsx` (dynamically imported on Excel export).
Hand-rolled SVG icons and CSS bar charts (no chart lib).

Architecture: `App.tsx` → `useAuth()` → `Login` or `Panel`. `Panel` holds one big
`UIState` (~40 fields) and calls `useFleetStore()` (`src/api.ts`) — one `GET /api/state`
at load; optimistic `patchCar`, server-confirmed mutations. **`src/useFleetView.ts`
(~1,770 lines)** is the derived-UI brain: period ranges, KPIs (ingresos counted by
*payment-application date*), alerts (service ≤15 días, seguro ≤20 días, en taller),
sorting/filtering, all modal/confirm form logic, xlsx export. Screens are pure renderers.

Six screens (`src/screens/`): **Resumen** (KPIs, vehicle table, alerts, top-5 rentables),
**Flota** (sortable table), **Choferes** (driver cards + detail), **Alertas**,
**Reportes** (movements ledger + gastos por categoría + Exportar Excel), **Cobros**
(Cuotas/Pagos tabs + Registrar pago). ~20 components incl. `DetailDrawer`, `PagoModal`
(with live imputation preview), `TallerModal`, `CarModal`, `DriverModal`.

## Frontend — `apps/admin-mobile` (Expo)

Expo SDK 56, react-native 0.85.3, react 19.2.3, expo-router (single route —
navigation is state-driven inside `src/app/index.tsx`), react-native-svg for all
icons/charts, reanimated + gesture-handler. Requires `EXPO_PUBLIC_API_URL` in `.env`
(LAN IP of the API for emulator/Expo Go dev, or the HTTPS tunnel URL for phone APKs).

Screens: **Dashboard** (hero net number, sparkline, donut gastos, BarList neto/auto,
HealthCard), **Flota**, **Detalle** (vehicle ficha with estado/chofer sheets, Cobro/Gasto
actions), **NuevoVehiculo**, **Registrar** (Cobro/Gasto tabs, custom NumericKeypad +
MoneyDisplay, comprobante picker), **Ranking**, **Reportes** (export buttons are stubs),
**Search**. `src/useMobileView.ts` (~1,320 lines) mirrors `useFleetView.ts` plus mobile
state (keypad digits, sheets, recents, Android BackHandler).

`types.ts`, `cobranza.ts`, `format.ts`, `data.ts` are **verbatim ports** of the
admin-web files — there is no shared package.

## Frontend — `apps/driver` (Expo, drivers)

Expo SDK 56, react-native 0.85.3, react 19.2.3, expo-router (grouped routes in
`src/app/(app)/`), expo-secure-store for the session token, expo-image-picker for
comprobante photos. Standalone install (own `node_modules`/lockfile — it left the npm
workspaces because hoisting broke `babel-preset-expo`/Metro resolution). Requires
`EXPO_PUBLIC_API_URL` in `.env` (same as admin-mobile).

Screens: **Login** (`usuario` = `nombre.apellido`), **Inicio** (resumen del chofer:
deuda, cuotas, pagos), **Pagar** (register payment + comprobante), **Pagos** (historial),
**Reportes** (reportar falla del auto), **Perfil**.

Driver auth: `POST /api/chofer/login` → bearer token (random opaque, stored hashed in
`chofer_sessions`); credentials are **per-car**, generated by the owner with
`POST /api/cars/:id/chofer-credenciales` — the seed does **not** create them.

## Shared domain model

- **Vehículo** — central entity; `driver` is a plain string (no chofer table: a driver
  exists by being assigned to a car; `Sin chofer` ⇒ `cuota = 0`).
- **Movimiento** — `ingreso` = issued cuota charge; `egreso` = expense in one of 6
  categories (Taller, Combustible, Seguro, Multas, Documentación, Otros). Amount is
  facturado; cobrado is derived.
- **Pago** — money in favor of a driver (not a car, not a specific cuota).
- **Imputación** (`cobranza.ts#imputar()`, duplicated in both frontends) — FIFO per
  driver, oldest debt first, recomputed on every read (nothing persisted). Produces
  per-cuota `cobrado` and per-driver `saldoAFavor` (overpayment credit). Debt follows
  the driver across vehicle reassignments (via the `movs.driver` snapshot).
- **Alertas** — derived, never stored: service ≤15 días, seguro ≤20 días, en taller.
- **Conventions** — money is integer ₲ with `.` thousands; dates travel as ISO
  `YYYY-MM-DD` (parsed at noon local client-side to dodge TZ shifts).

## Deploy & misc

- **Dockerfile** (3 stages, node:22): builds admin-web + api only; runtime serves SPA
  from Fastify, `/data` volume, healthcheck `/api/health`, `USER node`. The front stage
  intentionally installs **without** the package-lock (Windows lockfile misses the
  linux-x64 rolldown binding).
- **docker-compose.yml**: publishes `127.0.0.1:8791:3000` (loopback only; Caddy fronts
  it with TLS), named volume `miflota-data`, admin credentials from `.env`.
- **`.env.example`**: only the 3 first-user vars (apply once; then scrypt-hashed in DB).
- **`docs/`** (untracked): `android-emulator-setup.md` — CLI-only Android SDK + emulator
  + Expo Go setup notes for this dev machine.
- **`server/`** and **`dist/`** (root): stale build artifacts from an earlier layout —
  not tracked, not referenced by Docker; safe to ignore.
- **`apps/api/.localdata/`**: local dev DB (`miflota.db` + WAL), server.log, Expo manifests.
- **`apks/`** (untracked): locally built release APKs (`miflota-admin-sdk56.apk`,
  `miflota-chofer-sdk56.apk`) + `credenciales-choferes.json`. Built with
  `expo prebuild --platform android` + `gradlew.bat assembleRelease` (release uses the
  debug keystore). The generated `apps/*/android/` dirs are not source-controlled.
- **Android SDK** (this machine): `E:\android-sdk` — platforms 34+36, build-tools 36.0.0,
  NDK 27.1.12297006 (required by RN 0.85), emulator + AVD `MiFlota`. Setup doc:
  `docs/android-emulator-setup.md`.
- **`handoff.md`** (root): session notes — running servers, cloudflared tunnel URL,
  credentials, pending steps and gotchas.
