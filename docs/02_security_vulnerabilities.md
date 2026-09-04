# Security Audit: API and Driver App (snapshot histórico)

> Auditoría cerrada el 13 de agosto de 2026. Las capacidades agregadas después
> de esa fecha están resumidas en [current.md](current.md).

Date: 2026-08-13

## Method

OWASP API Top 10 and OWASP Mobile Top 10-oriented review of source, local API behavior, the Expo driver bundle, and Android emulator logs. Testing was limited to the local test API and test driver data. The supplied password is intentionally omitted from this report.

## Findings

| ID | Module / component | Type | Severity | Description | Steps to reproduce / PoC | Business impact | Technical recommendation |
|---|---|---|---|---|---|---|---|
| SEC-01 | Multipart upload routes in `index.ts` | Security / availability | High | `/api/cars/:id/taller`, `/api/cars/:id/egreso`, and `/api/chofer/pagos` write an accepted file before validating all fields. | Authenticated multipart request with an 8 MB file and invalid/missing `razon` or `monto` returned `400` while creating one file. The audit removed only its own test file afterward. | Repeated authenticated requests can fill the comprobantes volume and deny service. | Validate fields before writing; use a transaction/outbox cleanup strategy; enforce per-user upload quotas and monitor volume usage. |
| SEC-02 | `POST /api/chofer/pagos` | Security / business logic | Medium | The mobile client requires a receipt for `Transferencia`, but the API does not. | Direct bearer request with `monto=1`, `medio=Transferencia`, and no file returned `201` with `hasComprobante=false`; the created test row was deleted immediately. | A driver can claim a bank transfer without evidence and alter the account ledger. | Enforce the same rule server-side: require an accepted receipt when `medio` is `Transferencia`, or explicitly define receipt-free transfer semantics. |
| SEC-03 | `GET /api/health` | Information disclosure | Low | Health is public and returns the database path. | Local response: `{"ok":true,"db":".localdata/miflota.db"}`. Production response: `{"ok":true,"db":"/data/miflota.db"}`. | Reveals deployment filesystem details and confirms a live service. | Return only `{ "ok": true }` publicly; expose diagnostics behind internal auth or a private health endpoint. |
| SEC-04 | Login and write endpoints | Security / availability | Medium | Rate limiting exists only for login, is in-memory, and is not applied to payment, report, or upload routes. Restarting the process clears it. | Nine failed admin login attempts for a unique test username produced eight `401` responses followed by `429`; no equivalent limiter exists on write-heavy routes. | Credential attacks and authenticated upload/payment abuse can consume CPU, storage, or DB write capacity. | Add a shared rate limiter at the reverse proxy/API boundary; apply route-specific limits and persistent counters for sensitive operations. |
| SEC-05 | Driver/admin mobile API configuration | Transport security | Medium | Examples and local mobile `.env` files use plain HTTP LAN URLs. A token and credentials are sent without TLS if this configuration is used on an untrusted network. | `apps/driver/.env.example`, `apps/admin-mobile/.env.example`, and local `.env` use `http://...:3000`; driver bearer token is sent in the `Authorization` header. | LAN observers can capture credentials, bearer tokens, payments, and driver reports. | Require HTTPS outside an explicitly marked emulator/dev profile; fail closed for non-local HTTP in release builds; use a production environment value with certificate validation. |
| SEC-06 | Production Caddy/app response headers | Defense in depth | Low | Production HTTPS redirects correctly but does not emit HSTS or a global CSP/security-header policy. | `GET http://miflota.147-93-180-120.sslip.io/api/health` returned `308`; HTTPS response had Caddy transport headers but no observed `Strict-Transport-Security`. | Users remain more exposed to first-visit downgrade and browser-side injection weaknesses if a future XSS appears. | Add HSTS after confirming all subdomains are HTTPS, plus `X-Content-Type-Options`, `Referrer-Policy`, and a restrictive CSP for the SPA. |
| SEC-07 | Driver authentication | Security | Pass | Driver tokens are random opaque values, stored hashed in SQLite, sent as bearer tokens, and stored in Expo SecureStore rather than AsyncStorage/localStorage. | Source review of `authChofer.ts:23-64` and `driver/src/auth.tsx:26-65`; emulator logcat showed no token or password logging. | Good baseline control. | Keep SecureStore and add token rotation/revocation visibility and device/session management if production scope expands. |
| SEC-08 | Admin authentication | Security | Pass with limitation | Admin passwords use salted scrypt hashes, session tokens are hashed, cookies are httpOnly/SameSite, and logout revokes the session. | Source review plus local login/logout test: after logout, `/api/state` returned `401`. Production container sets `NODE_ENV=production`, enabling `Secure` cookies. | Good baseline control. | Add absolute/idle session controls and a central limiter; test cookie flags in a production authenticated deployment. |
| SEC-09 | BOLA / tenant isolation | Security | Pass in reviewed paths; cross-owner test limited | Admin vehicle, movement, payment, and report reads/writes consistently use owner predicates; driver routes resolve the car from the bearer session rather than a client-supplied ID. | Driver bearer token on `/api/state` returned `401`; unknown admin vehicle patch returned `404`; `owner_id` in a patch body was rejected as “Nada para actualizar”. The local DB had one admin owner, so a two-owner live differential test was not possible. | No direct BOLA found in reviewed code, but multi-owner regression coverage is still missing. | Add automated two-owner tests for every object route, including attachments and reports. |
| SEC-10 | SQL/NoSQL injection | Security | Pass in tested paths | Queries are parameterized and car patches use a field whitelist. | SQL-like login username returned `401`; malformed JSON returned `400`; invalid state returned `400`; no query concatenation with user values was found. | No injection reproduced. | Keep parameterization and add negative tests to CI. |

## Mobile-Specific Coverage Gaps

- No GPS, background location, mock-location detection, trip assignment, navigation, or WebSocket implementation exists. GPS spoofing and fare manipulation cannot be meaningfully tested because those features are absent.
- No notification permission or background execution configuration was found in `app.json` or driver source.
- The app handles `401` by clearing SecureStore and returning to login, but there is no offline queue, retry policy, or explicit network-state indicator.
- The driver payment amount is calculated client-side from selected days, but the server accepts any positive amount up to one billion. Overpayment is treated as account credit by current logic; confirm this is intentional and constrain it if it is not.

## Test Results

- Local admin login: `200`; `/api/me`: authenticated; `/api/state`: 16 vehicles including the test vehicle.
- Unauthenticated `/api/state`: `401`.
- Driver login: `200`; `/api/chofer/me`: `200`; `/api/chofer/resumen`: `200`; cross-access to admin `/api/state`: `401`.
- Driver logout followed by `/api/chofer/me`: `401`.
- Eight failed logins: `401`; ninth attempt: `429`.
- Android logcat: no fatal exception, React Native error, or password/token log found during the test window.
