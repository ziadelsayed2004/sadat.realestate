# frontend_113 - Route, Dead-Code, RTL/LTR, Design-System and Audit-Derived CSS/Bundle Cleanup

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G4_platform_hardening |
| Sequence | 232 |
| Dependencies | `backend_159` and `frontend_111` complete |
| Status | Open |

## Objective

Remove only evidence-backed dead routes/selectors and reduce initial-route CSS with selector-usage and per-route measurements while preserving visual, RTL/LTR, accessibility, and performance behavior.

## Readiness and dependencies

- Verify route/consumer inventory, API retirement decisions, SMTP/infrastructure gates, historical stylesheet deltas, and no-update regression baseline.
- Do not use an arbitrary total CSS target or perform a broad redesign/token rewrite.

## Allowed paths

Writes are limited to affected `apps/web/src/**`, `apps/web/tests/**`, `apps/web/scripts/**`, `scripts/**`, `packages/ui/**`, and exact Agent Pack evidence/state files. Every CSS/route deletion must be in the signed task target list.

## Forbidden paths and actions

- No `.env*`, `.local/**`, production data, Figma canonical artifacts, images, snapshot baseline update, Git index, commit, push, deploy, reset, revert, stash, clean, broad deletion, or history rewrite.
- No broad visual rewrite, hidden-region mask, crop, overlay, anti-alias mask, or nested agents.

## Ownership boundary

Frontend owns the exact route/CSS cohorts and focused tests. Shared design-system changes require a separate coordinator-owned request and direct evidence.

## Implementation requirements

1. Measure total CSS, initial-route CSS, selector used/unused, route family, AR/EN, and device evidence.
2. Compute safe headroom from historical positive deltas using `ceil((2 * largest positive delta)/1024)*1024` and record inputs.
3. Remove only duplicate/dead selectors, split route chunks, and safely consolidate styles with affected-route evidence.
4. Preserve language switch, deep links, approved viewport behavior, and runtime snapshots as regression-only evidence.

## Migration and rollback

No database migration. Restore the exact selector cohort or route chunk if direct review or no-update regression fails; do not reset or discard unrelated work.

## Focused verification

```powershell
npm.cmd run css:audit
npm.cmd run test:bundle --workspace apps/web
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:visual --workspace apps/web
npm.cmd run test:a11y --workspace apps/web
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run per-route AR/EN/device measurements, selector usage evidence, normal no-update snapshots, accessibility, URL, and performance checks.

## Evidence requirements

Publish route/consumer ledger, selector usage, historical input deltas, computed budget/headroom, exact changed selectors, affected-route captures, and no-regression results.

## Markers and stop

Success: `TASK_frontend_113_COMPLETE`

Blocked: `TASK_frontend_113_BLOCKED_CSS_REGRESSION`, `TASK_frontend_113_BLOCKED_ROUTE_TRUTH`, `TASK_frontend_113_BLOCKED_OWNERSHIP`, or `TASK_frontend_113_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start G5, update snapshots to hide differences, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
