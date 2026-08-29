# Provider Wave 2 Coordinator — PRV-01 through PRV-24

| Field | Value |
|---|---|
| Task | `provider_wave_2` |
| Status | `in_progress` |
| Canonical source | `Odl1Epn2u6lIEuIMmABT7o` |
| Forbidden source | `0HBdTNGROmmpC6S7OYa3iJ` |
| Scope | `PRV-01` through `PRV-24` |
| Locale scope | Arabic RTL and English LTR |
| Excluded locale | Simplified Chinese (`zh-CN`) — preserved, not tested or changed |
| Cursor | `PRV-01` |
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
