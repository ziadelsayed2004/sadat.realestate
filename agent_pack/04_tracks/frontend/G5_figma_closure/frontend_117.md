# frontend_117 - Provider Exact Parity

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G5_figma_closure |
| Sequence | 236 |
| Dependencies | `frontend_116` complete |
| Status | Open |

## Objective

Close repository-owned Provider differences against authenticated canonical Figma in AR/EN while preserving source exceptions and the email-only Provider OTP boundary.

## Readiness and dependencies

- Verify Seeker parity handoff, canonical hydrated artifacts, Provider fixtures/fonts/devices, and all prior gates.
- Any unavailable Provider source remains an explicit owner-attributed blocker.

## Allowed paths

Writes are limited to exact `apps/web/src/features/provider/**`, `apps/web/src/features/provider_property/**`, `apps/web/src/features/provider_auth/**`, affected `apps/web/tests/**`, bounded `packages/ui/**`/`packages/contracts/**` changes, `docs/quality/figma_parity/**` non-image evidence, and Agent Pack files.

## Forbidden paths and actions

- No `.env*`, `.local/**`, phone-auth changes, unrelated surfaces, images, snapshot update without direct review, forbidden Figma file, masks, crops, overlays, hidden regions, anti-alias masks, `--ignore-snapshots`, commit, push, deploy, reset, revert, stash, clean, or nested agents.

## Ownership boundary

Provider Coordinator owns only the Provider cohorts and focused tests. Shared components/styles/contracts require a separate bounded ownership request.

## Implementation requirements

1. Compare geometry, typography, spacing, assets, copy, interactions, loading/empty/error/retry/success, accessibility, responsive, and AR/EN direction.
2. Repair only repository-owned defects and preserve the 17 documented external cases until direct source review resolves them.
3. Separate runtime regression from Figma parity and record raw metrics without masking.

## Migration and rollback

No database migration. Restore exact prior Provider files/tests after rejected review; do not discard unrelated work.

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

Run authenticated direct comparison and normal no-update AR/EN/device regression checks.

## Evidence requirements

Record Provider screen/state IDs, source/runtime hashes, nodes, routes, roles, devices, fixtures, raw metrics, direct reviewer, classification, blocker owner, and separate regression result.

## Markers and stop

Success: `TASK_frontend_117_COMPLETE`

Blocked: `TASK_frontend_117_BLOCKED_FIGMA_ACCESS`, `TASK_frontend_117_BLOCKED_SOURCE`, `TASK_frontend_117_BLOCKED_EXTERNAL_ASSET`, `TASK_frontend_117_BLOCKED_MATERIAL_DIFFERENCE`, or `TASK_frontend_117_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_118, change Provider auth, update snapshots without review, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
