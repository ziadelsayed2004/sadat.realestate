# Provider Wave 2 Coordinator — PRV-01 through PRV-24

| Field | Value |
|---|---|
| Task | `provider_wave_2` |
| Status | partial_external |
| Canonical source | `Odl1Epn2u6lIEuIMmABT7o` |
| Forbidden source | `0HBdTNGROmmpC6S7OYa3iJ` |
| Scope | `PRV-01` through `PRV-24` |
| Locale scope | Arabic RTL and English LTR |
| Excluded locale | Simplified Chinese (`zh-CN`) — preserved, not tested or changed |
| Cursor | PRV-22-3 |
| Admin | unopened; dependency-ready only after Provider reconciliation |

## Lane ownership

| Lane | Screen range | Writable feature roots | Evidence roots |
|---|---|---|---|
| `provider_property_entry` | `PRV-01` through `PRV-14` | `apps/web/src/features/provider/properties.tsx`, `apps/web/src/features/provider_property/**`, `apps/web/src/features/provider_auth/**` | `docs/quality/figma_parity/screens/PRV-01/**` through `PRV-14/**` |
| `provider_operations` | `PRV-15` through `PRV-20` | `apps/web/src/features/provider/projects*`, `customer-requests*`, `viewings*`, `advertising*` | `docs/quality/figma_parity/screens/PRV-15/**` through `PRV-20/**` |
| `provider_notifications_settings` | `PRV-21`, `PRV-22-1` through `PRV-22-3` | `apps/web/src/features/provider/notifications*`, `apps/web/src/features/provider/settings*` | `docs/quality/figma_parity/screens/PRV-21/**`, `PRV-22-1/**`, `PRV-22-2/**`, `PRV-22-3/**` |

Provider-only tests and fixtures may be changed only within the matching lane. Agents must not modify snapshots, shared E2E harnesses, shared components, global styles/tokens, routers, contracts, API files, root scripts, or Agent Pack files. The Coordinator owns those paths and processes exact JSON shared-change requests serially.

## Shared Coordinator ownership

`apps/web/src/features/provider/index.ts`, `apps/web/src/features/provider/overview.tsx`, `apps/web/src/features/provider/data.ts`, `apps/web/src/features/provider/copy.ts`, `apps/web/src/features/provider/styles.css`, all app entry points and routers, `packages/contracts/**`, `apps/api/**`, OpenAPI/Postman/inventory artifacts, shared fixtures/harnesses/snapshots, `agent_pack/**`, and canonical queue/checkpoint/ledger/release files.

## Operating rules

- Process one screen at a time per lane and retain exact node, route, role, device, direction, state, API, and reviewed evidence.
- Use local approved Provider exports first. Do not retrieve or inspect Admin nodes.
- Close only as `REPAIRED_VERIFIED` or `VERIFIED_NO_CHANGE`; retain exact external blockers as partial only when proven external.
- Use one consolidated repair and recapture pass per screen unless a focused regression requires a bounded follow-up.
- Never test, update, regenerate, or delete `zh-CN` Provider files or snapshots.
- Admin remains unopened.

## Current integration closure

The current coordinator task is frontend_102. The final Provider AR/EN desktop no-update gate passed 70/70 after the shared navigation and PRV-08 media repairs. Seven screens are REPAIRED_VERIFIED; seventeen are PARTIAL_EXTERNAL because their approved safe contract projections are unavailable. Repository-owned Provider defects are zero. The current decision is POST_PROVIDER_INTEGRATION_BLOCKED, recorded in POST_PROVIDER_INTEGRATION_REPORT_2026-08-29.json.

Admin feature workflow remains unopened, unimplemented, and unmodified. The selected non-Admin API security suite included only existing Admin-route boundary probes. Simplified Chinese files and snapshots remain preserved and excluded.

## Pre-Admin handoff status - 2026-08-29

The historical `POST_PROVIDER_INTEGRATION_BLOCKED` decision is preserved above. It is superseded as the current coordination marker by `PRE_ADMIN_RECONCILIATION_READY_WITH_EXTERNAL_EXCEPTIONS` after the optional local Admin bootstrap was explicitly skipped through process-only configuration.

- Provider PRV-01 through PRV-24 remain 7 `REPAIRED_VERIFIED` and 17 `PARTIAL_EXTERNAL`, with zero repository-owned defects. The exact screen-level owners, safe-contract decisions, and next actions are in `agent_pack/08_reality_sync/PRE_ADMIN_RECONCILIATION_REPORT_2026-08-29.json`.
- The final Provider AR/EN desktop no-update gate remains 70/70. No Provider value was fabricated to close an external projection gap.
- The standalone MongoDB transaction limitation caused the historical `ADMIN_BOOTSTRAP_FAILED` marker. The transactional Admin bootstrap implementation was retained; local non-Admin readiness passed with `LOCAL_AUTO_BOOTSTRAP_ADMIN=false` supplied only as a process override.
- Provider coordination is complete for this pass and the handoff is ready for `ADM-01`. Admin UI, Admin Figma nodes, and zh-CN files remain unopened and unchanged.
