# UI/UX and Functional QA Report (snapshot histórico)

> QA cerrado el 13 de agosto de 2026. Los hallazgos sobre Admin Mobile, GPS y
> mapas corresponden a ese corte; ver [docs/current.md](current.md).

Date: 2026-08-13

## Test Matrix

| Surface | Test | Result |
|---|---|---|
| Driver Expo app | Android emulator launch through Expo Go | Pass |
| Driver Expo app | Login with seeded driver | Pass |
| Driver Expo app | Inicio with debt and assigned vehicle | Pass |
| Driver Expo app | Pagos empty state and payment entry screen | Pass |
| Driver Expo app | Reportes empty state and navigation | Pass |
| Driver Expo app | Perfil and logout control visible | Pass |
| Admin web | Vite dev page and login render | Pass |
| Admin web | Production build | Pass |
| Admin mobile | Expo bundle launch | Pass as auth probe; fail as full product |
| All frontends | Lint | Pass with warnings |

## Findings

| ID | Module / component | Type | Severity | Description | Steps to reproduce / evidence | Business impact | Recommendation |
|---|---|---|---|---|---|---|---|
| UI-01 | `apps/admin-mobile/src/app/index.tsx` | Functional | High | Admin-mobile still displays the temporary `Auth vertical slice` instead of the actual fleet panel. | Launching Expo on Android showed `Auth vertical slice`, `API_BASE`, and raw request logs. | The owner cannot use the intended mobile dashboard, despite dashboard screen files existing. | Port the existing web-oriented screens to native React Native and make the authenticated Expo route render the fleet shell. |
| UI-02 | `apps/admin-mobile/src/screens/*` | Functional / architecture | High | The retained admin-mobile screens use DOM tags, CSS style strings, `window`, and `history`, so they are not native Expo screens. | `Dashboard.tsx`, `Shell.tsx`, and `useMobileView.ts` use `<div>`, `<main>`, `<button>`, `window.addEventListener`, and `history.pushState`. | Wiring them directly will fail or behave inconsistently on Android/iOS. | Replace with React Native primitives, navigation state, and native file/date controls before routing them. |
| UI-03 | Driver app scope | Functional | High | The driver product has no trip lifecycle, live map, online/offline state, location tracking, push-notification flow, or background GPS flow. | No ride/trip/location routes, types, permissions, or map dependency found. | The app cannot support dispatch or real-time route operations required of a driver platform. | Define and implement the trip state machine and connectivity model before treating the driver app as route-ready. |
| UI-04 | Driver connectivity | Functional | Medium | Screens show loading spinners and clear sessions on `401`, but there is no offline banner, retry action, queued payment/report, or reconnection strategy. | `driver/src/api.ts` performs direct fetches; screens handle errors locally and no network-state module exists. | Drivers on unstable mobile networks can lose context or be unsure whether a payment/report was submitted. | Add network detection, explicit retry, idempotency keys for writes, and a pending/offline state. |
| UI-05 | Driver payment flow | Functional / security | Medium | The UI requires a transfer receipt, but that rule is not enforced by the API. | On emulator, transfer is selected and receipt UI is shown; direct API PoC in security report created a transfer with no receipt. | The visible flow gives a false assurance about payment evidence. | Align server and client validation; show a server-confirmed receipt status. |
| UI-06 | Driver ergonomics | UI/UX | Pass with scope gap | Login and primary buttons have large touch targets (roughly 52-54 px minimum), dark/light contrast is strong, and the four-tab layout is understandable. | Emulator screenshots and UI hierarchy showed clear `Inicio`, `Pagos`, `Reportes`, and `Perfil` controls. | Good baseline for handheld use. | Preserve target sizes; add large offline/retry affordances and route-specific safety states when trip features arrive. |
| UI-07 | Admin web responsive layout | UI/UX | Medium | The authenticated shell is a fixed two-column desktop grid with a 236 px sidebar; only selected detail content has a media query. | `admin-web/src/App.tsx:87-90` sets a fixed grid; `index.css` has a narrow media rule only for `.detalle-cols`. | Small screens may horizontally overflow or make the sidebar and dense tables unusable. | Add responsive navigation collapse, table/card adaptation, and test at 320, 390, 768, 1024, and 1440 CSS pixels. |
| UI-08 | Admin web error and data density | UI/UX | Low | The desktop panel loads complete historical state in one request and has dense tables/modals; mobile adaptation is not part of the current product. | `admin-web/src/api.ts:129-133` loads all state; `App.tsx` keeps a desktop grid. | Large fleets may create slow first paint and difficult scanning. | Add paginated APIs, skeletons with row-level loading, and explicit empty/error states per screen. |

## Positive Results

- Driver login, account summary, overdue balance, assigned vehicle, payments, reports, and profile all rendered on the Android emulator.
- Driver profile displayed the test vehicle, quota, and overdue state correctly.
- Empty states for payments and reports were explicit rather than blank screens.
- Admin web login page rendered cleanly at desktop size and the production build completed.
- The driver login uses SecureStore and the UI did not expose passwords or bearer tokens in tested logs.

## Missing Testability

- No automated unit, integration, API contract, or end-to-end UI test suite was found.
- No deterministic test fixture/reset command exists for driver/API flows.
- No accessibility audit tooling or screen-reader labels beyond selected native content descriptions was found.
