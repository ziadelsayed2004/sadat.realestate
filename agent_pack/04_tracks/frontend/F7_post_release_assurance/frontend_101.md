# frontend_101 - Provider Wave 2 Coordinator

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | Provider exact owner-clone parity coordination |
| Kind | coordination |
| Sequence | 210 / 210 |
| Depends on | `frontend_100` |
| Screen ownership | Existing Provider implementation tasks remain the sole owners of their mapped screens; this coordinator task intentionally has an empty `screens` array. |
| Current cursor | `PRV-01` |

## Purpose

Coordinate the Provider Wave 2 closure for `PRV-01` through `PRV-24` using three non-overlapping lane ledgers. Preserve all Wave 1 evidence and the completed `frontend_100` history. Keep Admin unopened until Provider reconciliation is complete.

The canonical source is `Odl1Epn2u6lIEuIMmABT7o`; `0HBdTNGROmmpC6S7OYa3iJ` is forbidden. Approved execution locales are Arabic RTL and English LTR. Existing Simplified Chinese files and snapshots are preserved and excluded from execution.

## Lane ledgers

The Coordinator-owned ledger is `08_reality_sync/PROVIDER_WAVE_2_LANE_LEDGER.json`. It records the exact nodes, routes, devices, disjoint writable paths, worker IDs, screen decisions, shared-change requests, and cursor for:

- `provider_property_entry`: `PRV-01` through `PRV-14`.
- `provider_operations`: `PRV-15` through `PRV-20`.
- `provider_notifications_settings`: `PRV-21`, `PRV-22-1`, `PRV-22-2`, and `PRV-22-3`.

Agents may edit only their assigned Provider feature files, Provider-only tests/fixtures, and assigned screen evidence. The Coordinator owns shared components, styles/tokens, routes, app entry points, contracts, API/OpenAPI/Postman, harnesses, snapshots, queues, checkpoints, ledgers, manifests, and all Agent Pack files.

## Acceptance

- Maintain exactly one audited Agent Pack task in progress and three non-overlapping Provider lane ledgers.
- Resolve every Provider screen against its canonical local source, exact node, route, role, device, locale, direction, deterministic state, API projection, interaction, accessibility, and security evidence.
- Close only as `REPAIRED_VERIFIED` or `VERIFIED_NO_CHANGE`; retain exact external blockers separately.
- Enforce email-only Provider identity, safe HTTPS-only `mapUrl` (maximum 2048), ownership/RBAC/IDOR protection, safe projections, and upload/document authorization.
- Do not test or modify Simplified Chinese, Admin, historical Wave 1 evidence, or production SMTP/migrations.

## Verification

Focused Provider lane tests during implementation; after convergence, the combined Provider typecheck, lint, unit/API/contract, AR/EN visual, accessibility, interaction/route, RBAC/ownership/IDOR, upload security, email-only Auth, map URL, performance, build, Agent Pack sync/audit, and `git diff --check` gates.

