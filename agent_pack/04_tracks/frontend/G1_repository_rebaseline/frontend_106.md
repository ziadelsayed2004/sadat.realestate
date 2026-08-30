# frontend_106 - Fresh Read-Only Baseline and Per-File Ownership/Provenance Manifest

| Field | Value |
|---|---|
| Track | frontend |
| Phase | G1_repository_rebaseline |
| Kind | governance |
| Sequence | 215 |
| Dependencies | None; frontend_105 is historical input only |
| Atomic boundary | Read-only preflight, manifest tooling, dated ownership/provenance manifest, and this task's Agent Pack records |

## Objective

Establish the truthful protected baseline required before any subsequent repository, product, database, visual, or infrastructure mutation. The worktree is treated as protected/potentially dirty regardless of the observed status output.

## Readiness gate

- Read the current task objective, task catalog/state, checkpoint, existing ownership evidence, and the task runner.
- Run the read-only Git preflight before writing anything.
- Confirm that no file outside the Agent Pack task scope is an approved write target.
- Stop with `TASK_frontend_106_BLOCKED_OWNERSHIP` if any proposed target is user-owned, unknown, outside the exact allowed paths, or overlaps unrelated work.

## Allowed paths

- `agent_pack/03_execution/TASK_CATALOG.json`
- `agent_pack/03_execution/TASK_STATE.json`
- `agent_pack/03_execution/DEPENDENCIES.json`
- `agent_pack/03_execution/ATOMIC_TASK_MAP.json`
- `agent_pack/03_execution/RUN_CHECKPOINT.json`
- `agent_pack/04_tracks/frontend/G1_repository_rebaseline/frontend_106.md`
- `agent_pack/07_finish/frontend_106/completion.json`
- `agent_pack/08_reality_sync/PRE_COMMIT_RELEASE_AUDIT_OWNERSHIP_MANIFEST_2026-08-30.json`
- `agent_pack/08_reality_sync/FRONTEND_106_BASELINE_2026-08-30.json`
- `agent_pack/scripts/create_ownership_provenance_manifest.mjs`

Reading elsewhere is permitted only for baseline verification. No implicit shared-file ownership exists.

## Forbidden paths and actions

- Any product implementation under `apps/**`, `packages/**`, or runtime assets.
- `.env*`, `.local/**`, `node_modules/**`, `dist/**`, `build/**`, `coverage/**`, test reports, Mongo data, or credentials; do not read or hash protected content.
- `.git/**` direct edits, Git index changes, image deletion/untracking, locale deletion, database migration, external artifact upload, SMTP operation, or Figma retrieval.
- `git clean`, reset, revert, stash, checkout-discard, broad deletion, commit, push, deploy, force push, history rewrite, or snapshot update.
- Masks, crops, overlays, hidden regions, anti-alias masks, nested agents, or any invented source/copy/enum/consent value.

## Ownership boundary

The Coordinator owns only the exact Agent Pack paths listed above. Existing repository files remain `USER_OWNED` or `HISTORICAL` until a later atomic task explicitly grants task ownership. Generated manifest/tooling files created here are `TASK_OWNED` and `GENERATED`; they are not silently treated as user changes.

## Implementation requirements

1. Capture branch, HEAD, upstream, divergence, status, worktree list, and `git diff --check` read-only.
2. Hash every tracked file outside protected scopes with SHA-256 and record path, tracked/ignored state, status, bytes, owner, classification, planned action, and last local commit/author provenance.
3. Record untracked task-owned generated files as metadata without reading or hashing protected files.
4. Record the baseline policy as `PROTECTED_POTENTIALLY_DIRTY`, even when status is empty at the initial capture.
5. Keep the canonical Figma file as `Odl1Epn2u6lIEuIMmABT7o`; never access `0HBdTNGROmmpC6S7OYa3iJ`.
6. Do not make claims about Git history or clone-size reduction; no history operation is in scope.

## Migration and rollback

No database/API/schema migration occurs. No external artifact migration occurs. The manifest/tooling change is additive and can be reverted only by an exact owner-approved patch in a later task; do not reset, stash, or discard unrelated work. No rollback is required for the read-only capture itself.

## Focused verification

```powershell
git status --short
git status -sb
git diff --check
git rev-list --left-right --count HEAD...origin/main
git log -1 --format="%H %s"
git worktree list --porcelain
node agent_pack/scripts/create_ownership_provenance_manifest.mjs
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Validate the dated manifest has 4,931 tracked records, no missing hashes or local-history provenance, records the task-owned generated entries, excludes protected scopes from content hashing, and preserves the observed `0 0` divergence.

## Evidence and Agent Pack updates

- `agent_pack/08_reality_sync/PRE_COMMIT_RELEASE_AUDIT_OWNERSHIP_MANIFEST_2026-08-30.json`
- `agent_pack/08_reality_sync/FRONTEND_106_BASELINE_2026-08-30.json`
- task catalog, state, dependencies, atomic map, checkpoint, finish index, board, count summary, and selector output
- completion record with commands, exit codes, baseline hash, file counts, and explicit no-mutation scope

Preserve historical records; add superseding truth. Keep at most one task in progress.

## Markers and stop condition

Success: `TASK_frontend_106_COMPLETE`

Blocked: `TASK_frontend_106_BLOCKED_DEPENDENCY`, `TASK_frontend_106_BLOCKED_APPROVAL`, `TASK_frontend_106_BLOCKED_OWNERSHIP`, `TASK_frontend_106_BLOCKED_EXTERNAL`, or `TASK_frontend_106_BLOCKED_VERIFICATION`.

After one marker and a concise handoff, stop completely. Do not select, create, or start `frontend_107`; do not run any other Luna task; do not use nested agents.
