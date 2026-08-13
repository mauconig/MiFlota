# Backend and Database Audit

Date: 2026-08-13

## Scope

Reviewed `apps/api/src/db.ts`, `auth.ts`, `authChofer.ts`, `cobranza.ts`, `seed.ts`, and `index.ts`. The running local API was queried at `http://192.168.100.204:3000` using the supplied local test account. No production data was modified.

## Architecture

- Fastify REST API with SQLite through `better-sqlite3`.
- Admin sessions use random opaque tokens stored as SHA-256 hashes and returned in an httpOnly cookie.
- Driver sessions use random opaque bearer tokens stored as SHA-256 hashes in `chofer_sessions`.
- SQLite uses WAL mode and foreign-key enforcement at connection startup.
- The admin web panel is served by Vite in development and is intended to be served by the API container in production.
- The driver app is a native Expo client. It stores the bearer token with Expo SecureStore.

## Data Model

| Entity | Key fields and relationships | Constraints and indexes |
|---|---|---|
| `users` | Admin/owner identity. `sessions.user_id` references it. | `usuario` is `UNIQUE COLLATE NOCASE`; `pass_hash` and identity fields are `NOT NULL`. |
| `sessions` | Admin cookie sessions, one row per token hash. | Primary key `token_hash`; FK to `users` with cascade delete; index by `user_id`. |
| `cars` | Vehicle, owner, assigned driver, quota, service/insurance metadata, driver credential hash. | Primary key `id`; state and service/insurance checks; index by `owner_id`; partial unique index on `driver_username`. `owner_id` has no FK to `users`. |
| `movs` | Vehicle income/expense ledger. `car_id` references `cars`. | Autoincrement primary key; type/state checks; indexes by `car_id`, date, and owner. |
| `pagos` | Driver payment/adjustment ledger. Optional `car_id` references `cars` with `SET NULL`. | Positive amount and payment-type checks; indexes by owner and driver. |
| `reportes_falla` | Driver issue report tied to one vehicle and owner. | `car_id` cascades on vehicle deletion; checks for urgency and report state; indexes by owner and vehicle. |
| `chofer_sessions` | Driver bearer sessions tied to a vehicle. | Primary key token hash; FK to `cars` with cascade delete; index by car. |
| `meta` | One-time migration flags. | Primary key `key`. |

### Missing transport-domain entities

The current schema does not contain `rides/trips`, GPS/location logs, geohashes/PostGIS, dispatch assignments, passengers, ratings, wallets, or payment-provider transactions. The product currently models vehicle quotas, owner ledger entries, driver payments, and vehicle fault reports rather than a ride-dispatch platform.

## Driver State Logic

There is no `Offline -> Online -> Assigned -> Arrived -> In_Transit -> Completed` state machine. The only persisted vehicle states are `activo`, `taller`, and `baja`. Driver authentication is associated with a vehicle, but there is no online presence, trip assignment, location heartbeat, route, or completion state.

The driver app supports:

- Login/logout and session persistence.
- Reading account summary and payment history.
- Submitting a payment with an optional receipt.
- Reading and submitting vehicle fault reports.
- Viewing the assigned vehicle and account profile.

## API Map

### Public routes

- `GET /api/health`
- `POST /api/login`
- `GET /api/me`
- `POST /api/chofer/login`

### Admin-session routes

- `POST /api/logout`
- `GET /api/state`
- `PATCH /api/cars/:id`
- `POST /api/cars`
- `DELETE /api/cars/:id`
- `POST /api/cars/:id/chofer-credenciales`
- `POST /api/cars/:id/taller`
- `POST /api/cars/:id/egreso`
- `GET /api/comprobantes/:id`
- `POST /api/pagos`
- `DELETE /api/pagos/:id`
- `GET /api/reportes`

### Driver bearer-session routes

- `POST /api/chofer/logout`
- `GET /api/chofer/me`
- `GET /api/chofer/resumen`
- `GET /api/chofer/pagos`
- `POST /api/chofer/pagos`
- `GET /api/chofer/reportes`
- `POST /api/chofer/reportes`

## Integrity and Performance Findings

| ID | Module / component | Type | Severity | Description | Reproduction / evidence | Business impact | Technical recommendation |
|---|---|---|---|---|---|---|---|
| DB-01 | `cars.owner_id`, `movs.owner_id`, `pagos.owner_id`, `reportes_falla.owner_id` | DB | Medium | Tenant ownership columns are `NOT NULL` but are not foreign keys to `users`. Orphaned or invalid owner IDs can be inserted directly and survive owner deletion. | Schema review of `db.ts:110-170`; only session and vehicle relationships use explicit owner-related FKs. | Data can become invisible to every owner, complicating recovery and reconciliation. | Add owner FKs where lifecycle permits, or enforce owner existence in one transaction and add integrity checks/migrations. |
| DB-02 | `POST /api/cars` | DB / functional | Medium | Plate uniqueness is checked with a preceding `SELECT`, but there is no database unique constraint. Concurrent requests can pass the check and create duplicate plates for one owner. | `index.ts:301-311`; no unique index on `(owner_id, plate)`. | Duplicate vehicle identity and incorrect ledger attribution. | Add a normalized plate column or unique index on `(owner_id, UPPER(plate))`; handle constraint conflicts as `409`. |
| DB-03 | `GET /api/state`, driver summary | Performance | Medium | Admin state loads every movement and payment for an owner in one response. Driver summary loads all owner income rows and filters by driver in application memory. | `index.ts:140-158` and `626-656`. | Response size and memory grow with fleet history; latency degrades as data accumulates. | Paginate history, query by date/driver in SQL, and add composite indexes such as `(owner_id, type, date)` and `(owner_id, driver, fecha)`. |
| DB-04 | SQLite write path | DB / availability | Low | WAL mode is enabled, but no explicit busy timeout or retry policy is configured. Multiple writes can surface `SQLITE_BUSY` during concurrent operations. | `db.ts:102-107`; no `busy_timeout` or retry wrapper found. | A payment or vehicle update can fail transiently under concurrent use. | Set a bounded busy timeout and retry only safe idempotent operations; keep write transactions short. |
| DB-05 | Taller/expense/payment upload paths | DB / storage | Medium | Uploaded files are written before all business validation and before the related database row is committed. Invalid requests can leave orphan files. | Reproduced against local `/api/cars/u1c0/egreso`: invalid multipart request returned `400` and created one file before cleanup. | Authenticated users can consume disk space without creating valid records. | Validate fields before writing, or delete the file on every validation/transaction failure. |
| DB-06 | Product data model | Functional / DB | High | No ride, trip, location, rating, wallet, or driver-presence model exists, so the requested transport lifecycle cannot be audited or implemented from this schema. | No corresponding tables, routes, or types found. | Dispatch, live tracking, trip billing, and driver state requirements are not represented. | Define the transport domain explicitly before adding UI claims for online state, trips, or GPS. |

## Positive Controls

- Parameterized SQL is used for data values; dynamic SQL is restricted to a server-side whitelist in `CAMPOS`.
- Foreign keys are enabled and vehicle deletion cascades movement/report rows as designed.
- Payment ownership and vehicle ownership are checked in SQL predicates.
- Migration `cobrado_migrado` uses a persistent `meta` flag and an immediate transaction to avoid repeating the historical payment migration.
- The local API build passed with `npm run build:api`.
