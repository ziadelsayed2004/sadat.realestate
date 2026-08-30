# frontend_115 - Public and Auth Exact Parity

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G5_figma_closure |
| Sequence | 234 |
| Dependencies | `frontend_114` complete |
| Status | Open |

## Objective

Close repository-owned Public and Auth visual/interaction differences against authenticated canonical Figma in Arabic RTL and English LTR using direct review and transparent metrics.

## Readiness and dependencies

- Verify the canonical source refresh, hydrated artifacts, approved viewport registry, deterministic fixtures/fonts, and G2/G4 gates.
- Keep runtime snapshots as deterministic regression evidence only; direct Figma review is required for parity.

## Allowed paths

Writes are limited to exact affected `apps/web/src/features/public/**`, `apps/web/src/features/auth/**`, `apps/web/src/features/provider_auth/**`, affected `apps/web/tests/**`, bounded `packages/ui/**`/`packages/contracts/**` changes with coordinator ownership, `docs/quality/figma_parity/**` non-image evidence, and Agent Pack files.

## Forbidden paths and actions

- No `.env*`, `.local/**`, unrelated routes, images, snapshots without direct review, forbidden Figma file, invented source/assets/data, masks, crops, overlays, hidden regions, anti-alias masks, `--ignore-snapshots`, commit, push, deploy, reset, revert, stash, clean, or nested agents.

## Ownership boundary

This task owns only Public/Auth feature cohorts and focused tests. Shared styles/router/contracts require a separate coordinator-owned change request.

## Implementation requirements

1. Compare geometry, typography, spacing, assets, states, copy, interactions, accessibility, responsive behavior, AR/EN direction, and route state.
2. Repair only repository-owned material defects; preserve source/contract/fixture blockers with owner and next task.
3. If a snapshot update is necessary after direct review, record old/new hashes, reviewer, reason, and follow with a normal no-update pass.

## Migration and rollback

No database migration. Restore the exact prior feature/style/test file when direct review rejects a change; do not reset unrelated work.

## Focused verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:visual --workspace apps/web
npm.cmd run test:a11y --workspace apps/web
npm.cmd run test:performance --workspace apps/web
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run direct authenticated comparisons and normal no-update AR/EN browser checks; never use ignore flags.

## Evidence requirements

Record screen IDs, nodes, routes, roles, states, locales/directions, device, fixture, source/runtime hashes, raw metrics, human review, defect classification, and separate regression/parity results.

## Markers and stop

Success: `TASK_frontend_115_COMPLETE`

Blocked: `TASK_frontend_115_BLOCKED_FIGMA_ACCESS`, `TASK_frontend_115_BLOCKED_SOURCE`, `TASK_frontend_115_BLOCKED_MATERIAL_DIFFERENCE`, `TASK_frontend_115_BLOCKED_OWNERSHIP`, or `TASK_frontend_115_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_116, change unrelated surfaces, update snapshots without review, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
