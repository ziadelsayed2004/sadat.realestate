# frontend_116 - Seeker Exact Parity

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G5_figma_closure |
| Sequence | 235 |
| Dependencies | `frontend_115` complete |
| Status | Open |

## Objective

Close repository-owned Seeker differences against authenticated canonical Figma in AR/EN while preserving every external/source exception and the email-only Seeker OTP boundary.

## Readiness and dependencies

- Verify canonical artifacts, Public/Auth parity handoff, deterministic Seeker fixtures, fonts, devices, and role/session setup.
- Do not invent source, data, or layouts for unavailable external frames.

## Allowed paths

Writes are limited to exact `apps/web/src/features/seeker/**`, affected `apps/web/tests/**`, bounded `packages/ui/**`/`packages/contracts/**` changes, `docs/quality/figma_parity/**` non-image evidence, and Agent Pack files.

## Forbidden paths and actions

- No `.env*`, `.local/**`, auth identity boundary changes, images, snapshot update without review, forbidden Figma file, masks, crops, overlays, hidden regions, anti-alias masks, `--ignore-snapshots`, commit, push, deploy, reset, revert, stash, clean, or nested agents.

## Ownership boundary

The Seeker Coordinator owns only Seeker feature/test cohorts and evidence. Shared shell/router/contracts require explicit coordinator ownership.

## Implementation requirements

1. Review all Seeker screens, loading/empty/error/retry/success states, interactions, accessibility, responsive devices, AR/EN direction, and session permissions.
2. Repair only material repository-owned defects and classify external blockers honestly.
3. Keep `regressionStatus`, `figmaParityStatus`, and `sourceType` independent.

## Migration and rollback

No database migration. Restore the exact prior bounded feature/test change after a rejected review; preserve unrelated work.

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

Run direct Figma review, AR/EN functional/accessibility/device tests, transparent metrics, and normal no-update regression snapshots.

## Evidence requirements

Record every Seeker screen/state with node, route, role, locale, direction, device, fixture, source/runtime hash, metrics, reviewer, defect, owner, and next task.

## Markers and stop

Success: `TASK_frontend_116_COMPLETE`

Blocked: `TASK_frontend_116_BLOCKED_FIGMA_ACCESS`, `TASK_frontend_116_BLOCKED_SOURCE`, `TASK_frontend_116_BLOCKED_MATERIAL_DIFFERENCE`, `TASK_frontend_116_BLOCKED_OWNERSHIP`, or `TASK_frontend_116_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_117, change OTP, update snapshots without review, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
