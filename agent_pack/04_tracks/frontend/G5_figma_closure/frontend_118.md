# frontend_118 - Admin Exact Parity

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G5_figma_closure |
| Sequence | 237 |
| Dependencies | `frontend_117` complete |
| Status | Open |

## Objective

Close repository-owned Admin differences against authenticated canonical Figma in AR/EN while preserving ADM-18 and ADM-54 source limitations unless exact approved source is found.

## Readiness and dependencies

- Verify Provider parity handoff, canonical Admin artifacts, transactional local admin prerequisites, role fixtures, and approved devices.
- ADM-18 remains `BLOCKED_SOURCE` without an exact approved frame; ADM-54 remains owner-baseline provenance unless recovered.

## Allowed paths

Writes are limited to exact `apps/web/src/features/admin/**`, `apps/web/src/features/admin_*/**`, affected `apps/web/tests/**`, bounded `packages/ui/**`/`packages/contracts/**` changes, `docs/quality/figma_parity/**` non-image evidence, and Agent Pack files.

## Forbidden paths and actions

- No `.env*`, `.local/**`, identity/RBAC boundary changes, unrelated Admin surfaces, images, snapshot update without direct review, forbidden Figma file, masks, crops, overlays, hidden regions, anti-alias masks, `--ignore-snapshots`, commit, push, deploy, reset, revert, stash, clean, or nested agents.

## Ownership boundary

Admin parity owns only affected Admin feature cohorts and evidence. Shared shell, APIs, and security changes require a separate coordinator task.

## Implementation requirements

1. Compare all Admin states, interactions, permissions, accessibility, responsive device scope, AR/EN direction, and typography/geometry/assets.
2. Repair only repository-owned material differences; preserve source blockers and do not invent layouts/data.
3. Keep Figma parity, runtime regression, and security/RBAC evidence separate.

## Migration and rollback

No database migration. Restore exact prior Admin style/component/test changes when review fails; preserve transactional data and unrelated work.

## Focused verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:visual --workspace apps/web
npm.cmd run test:a11y --workspace apps/web
npm.cmd run test:security --workspace apps/web
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run direct canonical review and normal no-update AR/EN functional, accessibility, responsive, security, and regression checks.

## Evidence requirements

Record all Admin states with node/source/runtime hashes, roles, routes, devices, fixtures, raw metrics, reviewer, classification, source blocker, and owner. Do not claim ADM-18 parity without source.

## Markers and stop

Success: `TASK_frontend_118_COMPLETE`

Blocked: `TASK_frontend_118_BLOCKED_FIGMA_ACCESS`, `TASK_frontend_118_BLOCKED_SOURCE`, `TASK_frontend_118_BLOCKED_RBAC`, `TASK_frontend_118_BLOCKED_MATERIAL_DIFFERENCE`, or `TASK_frontend_118_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_119, change Admin auth/RBAC, update snapshots without review, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
