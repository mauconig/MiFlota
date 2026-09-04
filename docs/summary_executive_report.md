# Executive Security and QA Summary (snapshot histórico)

> Informe cerrado el 13 de agosto de 2026. Sus afirmaciones de funcionalidades
> ausentes describen ese estado y no el producto vigente. Consultar
> [docs/current.md](current.md).

Date: 2026-08-13

## Overall Assessment

**Rating: high remediation need before production expansion.**

The current owner/driver ledger workflow is functional on the local API, admin web login surface, and native driver app. Authentication, token hashing, owner predicates, SQL parameterization, and basic rate limiting are solid foundations. However, the requested transport platform capabilities are not present: there are no rides, GPS logs, dispatch states, maps, notifications, or background location flows. The admin-mobile Expo app is still an authentication probe rather than the intended fleet UI.

The most urgent security issues are public Neo4j exposure on the VPS, pending host/runtime updates, authenticated multipart disk-exhaustion paths, and a server-side payment-proof validation gap.

## Risk Matrix

| ID | Risk | Severity | Status |
|---|---|---|---|
| VPS-01 | Neo4j public on 7474/7687 through Docker port publishing | High | Confirmed externally |
| VPS-02 | VPS reboot required and 23 upgrades pending | High | Confirmed on host |
| SEC-01 | Invalid multipart requests leave uploaded files on disk | High | Reproduced locally |
| DB-06 / UI-03 | Transport/trip/GPS domain and driver lifecycle absent | High | Confirmed by schema/source review |
| UI-01 / UI-02 | Admin-mobile is an auth probe; existing screens are web-only | High | Confirmed on emulator/source |
| SEC-02 / UI-05 | Transfer payment can be submitted without receipt via API | Medium | Reproduced locally |
| VPS-03 | Root SSH globally reachable; forwarding/X11 enabled | Medium | Confirmed on host |
| VPS-04 | No automated MiFlota backup schedule found | Medium | Confirmed by timer/cron review |
| DB-01 | Owner columns lack foreign-key integrity | Medium | Confirmed by schema review |
| DB-02 | Plate uniqueness is application-only and raceable | Medium | Confirmed by schema review |
| DB-03 | Unbounded state/history reads | Medium | Confirmed by query review |
| SEC-04 | Rate limiting does not cover writes/uploads and resets on restart | Medium | Confirmed by source/test |
| SEC-05 | Mobile examples use HTTP LAN API URLs | Medium | Confirmed by config/source |
| UI-04 | No offline/retry/queued write behavior | Medium | Confirmed by source/emulator scope |
| SEC-03 / VPS-05 | Public health endpoint leaks DB path | Low | Confirmed locally and in production |
| VPS-06 | HSTS/security headers not observed | Low | Confirmed on production response |

## Remediation Plan

### Immediate: before wider exposure

- Remove Neo4j public bindings and add Docker `DOCKER-USER` deny policy.
- Patch and reboot the VPS; verify Caddy, Docker containers, health checks, and backups afterward.
- Fix multipart lifecycle so invalid requests cannot persist files; add quotas and monitoring.
- Enforce transfer receipt requirements in the API, not only in the driver client.
- Replace public health diagnostics with a minimal liveness response.

### Near term

- Restrict SSH to a non-root sudo user, narrow source IPs/VPN access, disable unused forwarding/X11, and set idle timeouts.
- Add automated encrypted off-host MiFlota backups and restore tests.
- Require HTTPS for release mobile builds and reject non-local HTTP API URLs.
- Add two-owner BOLA integration tests, upload abuse tests, rate-limit tests, and session revocation tests to CI.
- Add composite indexes and pagination/date filtering before data volume grows.

### Product completion

- Port admin-mobile screens from DOM/CSS/history APIs to native React Native and route the authenticated fleet shell.
- Define and implement vehicles/drivers, rides/trips, dispatch, location, driver presence, notification, and rating models if this is intended to be a mobility platform.
- Add driver offline/retry/idempotency behavior and explicit connectivity state.
- Add automated Expo E2E coverage for login, debt summary, payment receipt flow, report submission, logout, and session expiry.

## Audit Limitations

- The local database had one admin owner, so a live two-owner differential BOLA test was not possible; code review and negative object tests were performed.
- No production admin credential was used; the supplied credential authenticated locally but not against the VPS database.
- GPS spoofing, trip assignment, maps, WebSockets, push notifications, and background permissions could not be tested because those features are absent.
- No changes were made to the VPS. The only project file created for this audit is this report set; local test database data is ignored by Git.

## Deliverables

- `docs/01_backend_db_audit.md`
- `docs/02_security_vulnerabilities.md`
- `docs/03_ui_ux_qa_report.md`
- `docs/04_vps_audit.md`
- `docs/summary_executive_report.md`
