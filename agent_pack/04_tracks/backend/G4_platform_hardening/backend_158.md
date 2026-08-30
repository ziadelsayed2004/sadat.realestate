# backend_158 - API Artifacts, Safe Migrations and Live Mongo Gates

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G4_platform_hardening |
| Sequence | 230 |
| Dependencies | `backend_157` complete |
| Status | Open |

## Objective

Synchronize API artifacts and apply only approved backward-compatible migrations with isolated replica-set, backup, restore, and live Mongo readiness evidence.

## Readiness and dependencies

- Verify API decisions, required routes, safe query behavior, migration plan, and a disposable or isolated replica-set.
- A standalone MongoDB instance is not transaction proof. Production apply requires separate deployment authorization.

## Allowed paths

Writes are limited to `apps/api/src/modules/database/**`, affected `apps/api/tests/**`, `apps/api/openapi/**`, `apps/api/postman/**`, `packages/contracts/**`, bounded `deploy/**`, `scripts/**`, and exact Agent Pack evidence/state files.

## Forbidden paths and actions

- No `.env*`, production Mongo, credentials, unrelated API behavior, images, snapshots, Git index, commit, push, deploy, reset, revert, stash, clean, broad migration, or history rewrite.
- No migration without dry-run/backup/rollback, no claims from standalone Mongo, and no nested agents.

## Ownership boundary

Backend owns database artifacts, isolated migration tests, and readiness evidence. Production infrastructure remains an external approval boundary.

## Implementation requirements

1. Keep runtime contracts, OpenAPI, Postman, and route inventory aligned.
2. Record dry-run counts, index definitions, explain evidence, schema versions, checkpoint, compatibility window, and restore proof.
3. Verify replica-set transaction behavior, backup/restore, and fail-closed behavior when topology is absent.

## Database migration and rollback

Apply only approved isolated batches. Rollback restores the exact backup/index definitions and prior compatible release; no production migration or irreversible deletion is allowed in this task.

## Focused verification

```powershell
npm.cmd run local:doctor
npm.cmd run local:status
npm.cmd run test:integration
npm.cmd run production:preflight
npm.cmd run api:audit
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run isolated replica-set, migration dry-run/apply, rollback, backup/restore, index, and artifact validation tests.

## Evidence requirements

Record topology, before/after counts, indexes/explain, migration versions, backup/restore logs, compatibility result, rollback command, and any blocked Production gate.

## Markers and stop

Success: `TASK_backend_158_COMPLETE`

Blocked: `TASK_backend_158_BLOCKED_REPLICA_SET`, `TASK_backend_158_BLOCKED_BACKUP`, `TASK_backend_158_BLOCKED_MIGRATION`, `TASK_backend_158_BLOCKED_OWNERSHIP`, or `TASK_backend_158_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start backend_159, apply Production changes, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
