# Local Driver Test Setup

Date: 2026-08-13

## Database Seed

Added one test vehicle to `apps/api/.localdata/miflota.db`, owned by the existing local admin account:

- Driver: Mateo Rojas
- Driver username: `mateo.rojas`
- Driver password: `MateoTest2026x`
- Vehicle id: `test-driver-2026`
- Plate: `TEST 026`
- Vehicle: Toyota Corolla, 2020
- Daily quota: 350,000 Gs
- Charges: June 13, July 13, and August 13, 2026
- Initial outstanding balance: 1,050,000 Gs

The password is for this local test database only. It is stored in the database as a hash.

## Fixture Expansion

Added schema-valid history for Mateo and `TEST 026`:

- Payments: 175,000 Gs in cash on June 20, 350,000 Gs by Giros Tigo on July 20, and a 100,000 Gs maintenance adjustment on August 10.
- Vehicle expenses: 180,000 Gs for oil and filters, plus 95,000 Gs for fuel.
- Fault reports: Motor/resolved, Neumaticos/urgent/in workshop, and Aire acondicionado/seen.
- Current calculated outstanding balance: 425,000 Gs.

## Emulator Verification

- Started the Android AVD `MiFlotaTest`.
- Connected Expo Go to the driver bundle on port `8082`.
- Logged in successfully as `mateo.rojas`.
- Verified the Inicio screen shows Mateo, the TEST 026 vehicle, and the 425,000 Gs debt.
- Verified the Pagos screen can load the three payment/adjustment records.
- Verified the Reportes screen can load the three fault reports and their statuses.
- Verified the Perfil screen shows Mateo, TEST 026, Toyota Corolla, the 350,000 Gs quota, and the overdue account state.

No production database or production credentials were changed.

---

# Background GPS Location Sharing

Date: 2026-08-13

## What was added

The driver app now shares GPS location in the background so the admin can locate the vehicle at any time.

### Backend (`apps/api`)

- New table `driver_locations` in `db.ts`: stores one row per vehicle with `latitude`, `longitude`, `accuracy`, `recorded_at`, `received_at`, and `mocked` flag.
- `GET /api/locations` (admin): returns latest known location for all vehicles owned by the admin.
- `POST /api/chofer/location` (driver bearer session): upserts the vehicle's latest position with coordinate validation, future-date rejection, and mock-location rejection.

### Driver app (`apps/driver`)

- New dependencies: `expo-location`, `expo-task-manager`.
- `src/location.ts`: manages permission requests (foreground + background), starts/stops `Location.startLocationUpdatesAsync` with a background task, and POSTs each fix to the API using the stored bearer token.
- `src/session.ts`: exports `TOKEN_KEY` constant shared by auth and location modules.
- `src/auth.tsx`: triggers `startLocationSharing()` after login and token restore; stops on logout.
- `src/app/_layout.tsx`: imports `location.ts` to register the task manager at app level (global scope requirement).
- `src/app/(app)/perfil.tsx`: shows "UBICACIÓN DEL AUTO" card with status, "Activar ubicación" button when needed, or "Expo Go no admite..." message.
- `app.json`: added `expo-location` plugin with `isAndroidBackgroundLocationEnabled` and permission strings.

### Admin web (`apps/admin-web`)

- `src/types.ts`: added `CarLocation` interface.
- `src/api.ts`: polls `GET /api/locations` every 30 seconds; stores in `FleetStore.locations`.
- `src/App.tsx`: passes `locations` to `useFleetView`.
- `src/useFleetView.ts`: derives `DetailView.location` from `locations` map with age, staleness, accuracy, and Google Maps URL.
- `src/components/DetailDrawer.tsx`: shows "Última ubicación" card with status badge, age, precision, and "Abrir mapa" link.

### Important notes

- Background location on Android only works in **development builds** or **standalone builds**, not in Expo Go. Expo Go shows: "Expo Go no admite ubicación en segundo plano en Android. Usá un development build."
- The development build (`expo run:android`) was successfully compiled and installed on the emulator as `com.mauconig.driver`.
- The API endpoint was verified with direct HTTP calls: location posts successfully and admin reads it back.
- Mock location detection: the API rejects `mocked: true` requests. The driver app passes `location.mocked` from `expo-location`.
