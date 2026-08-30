# Copy-Ready Luna Goal — backend_150

## Objective

Inventory every retired-locale occurrence and produce a dry-run-only migration design with exact targets, orphan handling, backup requirements, and rollback proof. Do not change database data, indexes, source, tests, snapshots, images, Git index, or external services.

## Dependencies and readiness gate

- Active program: `SADAT_G1_G6_APPROVED_2026-08-30`.
- Predecessor: `frontend_106` must remain `complete`.
- The current selector chose `backend_150` as the first open dependency-ready task.
- Read the current Goal/objective, `RUN_CHECKPOINT.json`, `TASK_STATE.json`, `TASK_CATALOG.json`, active registry, ownership manifest, and this file.
- The Mongo target must be an isolated, non-production, replica-set-capable environment supplied outside Git.
- If a target path is USER_OWNED, UNKNOWN, outside the allowed roots, or overlaps unrelated work, emit `TASK_backend_150_BLOCKED_OWNERSHIP` and stop.

## Exact allowed paths

- `agent_pack/03_execution/**` for additive checkpoint/state evidence only.
- `agent_pack/04_tracks/backend/G1_repository_rebaseline/backend_150.md`.
- `agent_pack/07_finish/backend_150/**` only if task-local evidence is required.
- `agent_pack/08_reality_sync/BACKEND_150_RETIRED_LOCALE_INVENTORY_2026-08-30.json` and an additive dated superseding report.
- `agent_pack/scripts/**` only for bounded read-only inventory tooling owned by this task.

## Forbidden paths and actions

- Product/runtime files under `apps/**`, `packages/**`, `scripts/**`, and all visual/source files.
- `.env*`, secrets, credentials, `.local/**`, `node_modules/**`, build/output directories, and production Mongo.
- Active locale deletion, translation, index removal, image deletion, Git index changes, history rewrite, or external upload.
- `git clean`, reset, revert, stash, checkout-discard, broad deletion, commit, push, deploy, force push, or nested agents.

## Implementation requirements

1. Run a read-only inventory for `zh-CN`/retired-locale variants across contracts, API source, DB schema/indexes/migrations, UI/routes/copy, seeds, tests, snapshots, docs, Agent Pack and filenames.
2. Run a Mongo dry-run only. Report counts for records with valid AR/EN, retired locale plus AR/EN, retired locale only, and retired preferred locale.
3. Any record without AR or EN is a hard apply blocker; never auto-translate or fabricate.
4. Produce exact target manifests for source, DB fields/indexes, tests/snapshots, docs/Agent Pack and visual artifacts. Do not delete any target.
5. Record the separate approvals required for DB apply, source removal, tests/snapshots, visual deletion, image-only untracking, and optional history reduction.
6. Preserve historical Agent Pack statuses and use `RETIRED_LOCALE` only for active sanitized truth after approval.

## Database/migration and rollback

- This task is dry-run only; no apply flag and no production connection.
- Record collection/index names, before counts, projected changes, orphan counts, checkpoint, and exact restore command.
- Backup and restore proof must precede any future DB apply task.
- Rollback is restoration of the exact isolated backup and index definitions; no broad reset or discard.

## Focused verification

```powershell
git status --short
git diff --check
npm.cmd run locale:audit
node agent_pack/scripts/audit_pack.mjs
```

Use only the approved isolated read-only Mongo dry-run command recorded in the task evidence. Do not run full product builds, migrations, snapshot updates, or Live Preview startup in this task.

## Evidence and Agent Pack updates

Record command/exit-code output, exact occurrence paths, Mongo counts/index definitions, backup/restore proof or blocker, ownership decisions, and unresolved approvals. Update only the task-local evidence, checkpoint, dependency/state record, and Finish Index entry for this task. Run sync and audit; retain historical entries.

## Markers and stop

Success: `TASK_backend_150_COMPLETE` only when the read-only inventory and dry-run evidence are complete.

Blocked: `TASK_backend_150_BLOCKED_DEPENDENCY`, `TASK_backend_150_BLOCKED_APPROVAL`, `TASK_backend_150_BLOCKED_OWNERSHIP`, `TASK_backend_150_BLOCKED_EXTERNAL`, or `TASK_backend_150_BLOCKED_VERIFICATION`.

After one marker and a concise handoff, stop completely. Do not select, create, or start another task. No nested agents.
