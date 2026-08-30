# frontend_107 - AR/EN Runtime, Language Switch, SSR/Hydration and URL Preservation

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G2_ar_en_runtime |
| Sequence | 219 |
| Dependencies | `backend_151` complete |
| Status | Open |

## Objective

Implement the approved Arabic RTL and English LTR language switch across public and authenticated shells while preserving route, query, hash, SSR, hydration, and safe persistence semantics.

## Readiness and dependencies

- Verify the approved G2 contract, migration result, rollback proof, and ownership manifest.
- Confirm no active retired-locale contract remains in the exact owned target inventory.
- Do not start G3 or change request/identity contracts in this task.

## Allowed paths

Writes are limited to `apps/web/src/features/localization/**`, `apps/web/src/features/routing/**`, `apps/web/src/app/**`, affected `apps/web/tests/**`, `packages/contracts/src/localization/**`, and exact Agent Pack evidence/state files. Shared UI changes require a separately owned bounded change request.

## Forbidden paths and actions

- No `.env*`, `.local/**`, runtime assets, image/snapshot deletion or update, database, API request pipeline, identity boundary, or unrelated feature roots.
- No full redesign, masks, crops, overlays, hidden regions, anti-alias masks, `--ignore-snapshots`, unreviewed snapshot update, commit, push, deploy, reset, revert, stash, clean, or nested agents.

## Ownership boundary

Frontend owns the localization/routing/app paths and tests listed above. Shared contracts are modified only when directly required and recorded. Historical locale evidence remains untouched.

## Implementation requirements

1. Change `html.lang` and `html.dir` correctly for AR/EN and keep document direction consistent through navigation and hydration.
2. Preserve pathname, query, hash, active route, deep links, scroll semantics, and locale choice locally/profile-safely without leaking identity.
3. Avoid full reload except approved SSR canonical navigation; prevent hydration mismatch and stale locale flash.
4. Keep Seeker/Provider email-only OTP and Admin email/password boundaries unchanged.
5. Run no-update runtime snapshots separately from direct Figma parity review.

## Migration and rollback

No database migration. Rollback restores the exact prior locale/router implementation and test fixtures using a bounded patch; do not reset or discard unrelated changes. Keep compatibility with the approved backend contract until verification passes.

## Focused verification

```powershell
npm.cmd run locale:audit
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:locale --workspace apps/web
npm.cmd run test:a11y --workspace apps/web
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run AR/EN browser deep-link, SSR/hydration, keyboard, accessibility, and no-update regression checks.

## Evidence requirements

Record route/query/hash before/after, `lang`/`dir`, persistence behavior, hydration result, device/locale matrix, screenshots or snapshots used only as regression evidence, and any source blocker separately.

## Markers and stop

Success: `TASK_frontend_107_COMPLETE`

Blocked: `TASK_frontend_107_BLOCKED_DEPENDENCY`, `TASK_frontend_107_BLOCKED_APPROVAL`, `TASK_frontend_107_BLOCKED_OWNERSHIP`, `TASK_frontend_107_BLOCKED_EXTERNAL`, or `TASK_frontend_107_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start G3, change APIs or data, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
