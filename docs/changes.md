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

## Emulator Verification

- Started the Android AVD `MiFlotaTest`.
- Connected Expo Go to the driver bundle on port `8082`.
- Logged in successfully as `mateo.rojas`.
- Verified the Inicio screen shows Mateo, the TEST 026 vehicle, and the 1,050,000 Gs debt.
- Verified the Pagos screen loads with no payments recorded.
- Verified the Reportes screen loads with no reports recorded.
- Verified the Perfil screen shows Mateo, TEST 026, Toyota Corolla, the 350,000 Gs quota, and the overdue account state.

No production database or production credentials were changed.
