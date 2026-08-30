# frontend_120 - Final Platform Release Coordinator

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G6_final_integration |
| Sequence | 239 |
| Dependencies | All required G2-G5 tasks complete or explicitly blocked with evidence |
| Status | Open |

## Objective

Run final focused convergence and one full integration audit, reconcile Agent Pack truth, classify readiness/blockers, and prepare an atomic commit plan without committing, pushing, or deploying.

## Readiness and dependencies

- Verify all registered G2-G5 dependencies, migration/rollback evidence, artifact restoration, production prerequisites, and no pending destructive action.
- Do not use the final gate to repair a newly discovered product defect; create a bounded proposal and stop.

## Allowed paths

Writes are limited to `apps/web/tests/**`, `apps/api/tests/**`, `packages/config/**` only for bounded gate support, `scripts/**`, `docs/api/**`, `docs/deployment/**`, `docs/quality/figma_parity/**` reports/ledgers, and Agent Pack files. No implementation source change is allowed inside this final audit.

## Forbidden paths and actions

- No broad product fixes, `.env*`, `.local/**`, production data, images, masks, crops, overlays, hidden regions, anti-alias masks, snapshot updates/ignore flags, unapproved deletion, Git index, migration, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No Full Parity or Production Readiness claim with unresolved blockers and no nested agents.

## Ownership boundary

The Final Coordinator owns reports, evidence synchronization, cleanup classification, and atomic commit plan. Any implementation defect is outside this task and must be proposed separately.

## Implementation requirements

1. Run focused convergence then one 131-screen AR/EN matrix and applicable API/contracts/security/build/bundle/a11y/performance/SEO/readiness gates.
2. Verify runtime snapshots in no-update mode independently from canonical Figma parity evidence.
3. Reconcile task catalog/state/active registry/dependencies/checkpoint/finish index and keep historical records immutable.
4. Classify cleanup only for `TEMPORARY_UNREFERENCED` artifacts created by active tasks and only with separate approval.
5. Publish an honest Arabic final report, machine-readable release manifest, remaining blockers, and atomic commit plan without executing it.

## Migration and rollback

No migration or deployment. Reports are additive/superseding. Any approved cleanup has its own exact target list and restore proof; an implementation defect becomes a separate task.

## Focused verification

```powershell
npm.cmd run quality
npm.cmd run test
npm.cmd run test:e2e --workspace apps/web -- approved AR/EN projects
npm.cmd run test:a11y --workspace apps/web
npm.cmd run test:performance --workspace apps/web
npm.cmd run test:security --workspace apps/web
npm.cmd run production:config
npm.cmd run production:preflight
node agent_pack/scripts/sync_pack.mjs
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run only after all dependencies are satisfied; no snapshot update or ignore flag is allowed.

## Evidence requirements

Publish full matrix and API truth, migration/rollback status, artifact restore, production prerequisites, cleanup classification, command exit codes, remaining exceptions, readiness marker, and atomic commit plan.

## Markers and stop

Success: `TASK_frontend_120_COMPLETE` only when evidence supports it; otherwise `TASK_frontend_120_BLOCKED` or `TASK_frontend_120_PARTIAL` with exact reason.

Blocked: `TASK_frontend_120_BLOCKED_DEPENDENCY`, `TASK_frontend_120_BLOCKED_SOURCE`, `TASK_frontend_120_BLOCKED_INFRASTRUCTURE`, `TASK_frontend_120_BLOCKED_VERIFICATION`, or `TASK_frontend_120_BLOCKED_OWNERSHIP`.

Execute exactly one task. Do not create a commit, push, deploy, or start another task. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
