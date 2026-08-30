# Active One-Task Luna Runner — Sadat Real Estate

Execute exactly one dependency-ready active Agent Pack task: `{{TASK_ID}}`. Stop after that task.

## Preconditions

1. Read the current Codex Goal/objective, active registry, latest checkpoint, task catalog/state/dependencies/atomic map, ownership manifest, current-state reports, and `{{TASK_ID}}` task file.
2. Run read-only preflight:

```powershell
pwd
git status --short
git status -sb
git diff --check
git rev-list --left-right --count HEAD...origin/main
git log -1 --format="%H %s"
git worktree list --porcelain
```

3. Treat the working tree as protected and potentially dirty regardless of output.
4. Verify `{{TASK_ID}}` is in `SADAT_G1_G6_APPROVED_2026-08-30`, all dependencies are complete, and required approvals/evidence exist.
5. Resolve every write path against the current ownership manifest. If a path is USER_OWNED, UNKNOWN, outside the task allowlist, or overlaps unrelated work, emit `TASK_{{TASK_ID}}_BLOCKED_OWNERSHIP` and stop without mutation.

## Allowed and forbidden boundary

- Use only exact paths and target lists recorded in `{{TASK_ID}}`. Read elsewhere only for verification.
- Never edit `.git/**`, `.env*`, secrets, credentials, `.local/**`, build outputs, runtime evidence outputs, or user-owned/unrelated files.
- Never use the forbidden Figma file `0HBdTNGROmmpC6S7OYa3iJ`.
- Never use `git clean`, reset, revert, stash, checkout-discard, broad deletion, commit, push, deploy, force push, history rewrite, snapshot ignore/update flags, masks, crops, overlays, hidden regions, or anti-alias masks.
- No nested agents unless explicitly authorized.

## Execution

1. Execute only the bounded objective in `{{TASK_ID}}`.
2. Destructive, database, index, external-send, or external-storage tasks require their own approval token, exact target list, hashes, dry-run, backup, and restore proof before action.
3. Preserve compatibility until verification passes. Treat sourceRoute, referrer, attribution, relations, assignment, status, audit fields, timestamps, and other sensitive metadata as server-derived or allowlisted.
4. Do not invent `preferredContactTime`; do not add `consentAt`; do not expose Mongo ObjectId as a public request reference. Keep Seeker/Provider email-only OTP and Admin email/password boundaries.
5. Keep runtime regression evidence separate from canonical Figma parity evidence.

## Verification and evidence

Run only task-focused checks, affected typecheck/lint/contract tests, and `git diff --check`. For database/API changes record before/after counts, indexes, versions and rollback command. For UI/Figma changes use AR/EN functional/accessibility checks, verified canonical source `Odl1Epn2u6lIEuIMmABT7o`, transparent full-canvas metrics and direct review; never use snapshots as parity proof. Runtime snapshots, if task-owned and approved, use no-update follow-up.

Update only the task file, task-local evidence, checkpoint/dependencies/state/Finish Index and approved reports. Preserve historical records. Run:

```powershell
node agent_pack/scripts/sync_pack.mjs
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

## Markers and stop

Success: `TASK_{{TASK_ID}}_COMPLETE`.

Blocked: `TASK_{{TASK_ID}}_BLOCKED_DEPENDENCY`, `TASK_{{TASK_ID}}_BLOCKED_APPROVAL`, `TASK_{{TASK_ID}}_BLOCKED_OWNERSHIP`, `TASK_{{TASK_ID}}_BLOCKED_EXTERNAL`, or `TASK_{{TASK_ID}}_BLOCKED_VERIFICATION`.

Emit one marker and concise handoff, then stop. Do not select, create, or start the next task.
