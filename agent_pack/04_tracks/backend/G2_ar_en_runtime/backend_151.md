# backend_151 - Two-Locale Contracts, Database/Index Migration and Rollback

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G2_ar_en_runtime |
| Sequence | 218 |
| Dependencies | `backend_150` and `frontend_112` complete with approvals |
| Status | Open |

## Objective

Make Arabic and English the only active runtime/data contract locales with a reversible database and index migration that never fabricates translations or destroys unverified records.

## Readiness and dependencies

- Verify both G1 inventory reports, exact target manifests, orphan blockers, backup/restore proof, and explicit migration approval.
- Use an isolated replica-set target only; Production application requires a separate deployment approval.
- Stop before apply when any record lacks a valid AR or EN value.

## Allowed paths

Writes are limited to `apps/api/src/modules/localization/**`, `apps/api/src/modules/database/**`, `apps/api/tests/localization/**`, `apps/api/tests/database/**`, `packages/contracts/src/localization/**`, `packages/contracts/src/database/**`, and exact Agent Pack evidence/state files. `.env*` and production data are never write targets.

## Forbidden paths and actions

- No `.env`, `.env.local`, `.env.production`, `.local/**`, production Mongo, runtime assets, screenshots, or unrelated source.
- No automatic translation, guessed locale, consent, phone-auth change, broad deletion, unapproved index removal, commit, push, deploy, reset, revert, stash, clean, history rewrite, masks, or nested agents.

## Ownership boundary

Backend owns the listed localization/database/contract paths and its Agent Pack evidence. Existing unrelated shared contracts and user changes remain protected. No frontend writer is implied.

## Implementation requirements

1. Preserve an exact occurrence ledger and dry-run counts before apply.
2. Migrate retired preferred locale to canonical `ar` only where policy and source data prove it; unset retired localized fields only for approved exact targets.
3. Rebuild text indexes using AR/EN only and record before/after definitions and explain evidence.
4. Preserve backward compatibility until counts, hashes, indexes, and restore verification pass.
5. Keep active runtime contracts and Agent Pack status synchronized without rewriting historical evidence.

## Database migration and rollback

Run dry-run first, then only approved isolated replica-set batches with checkpoints. Rollback restores the captured collections and index definitions and re-enables the previous compatible read path. No Production apply is allowed in this task run.

## Focused verification

```powershell
npm.cmd run locale:audit
npm.cmd run typecheck
npm.cmd run lint
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run focused migration/index tests and restore proof; missing topology or backup is blocked, not passed.

## Evidence requirements

Record approvals, dry-run/apply counts, blocked orphan records, index definitions/explain output, migration version/checkpoint, restore command/result, rollback result, and AR/EN contract hashes.

## Markers and stop

Success: `TASK_backend_151_COMPLETE`

Blocked: `TASK_backend_151_BLOCKED_DEPENDENCY`, `TASK_backend_151_BLOCKED_APPROVAL`, `TASK_backend_151_BLOCKED_OWNERSHIP`, `TASK_backend_151_BLOCKED_EXTERNAL`, or `TASK_backend_151_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start `frontend_107`, touch Production, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
