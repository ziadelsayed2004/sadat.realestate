# backend_150 - Retired-Locale Inventory and Migration Design

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G1_repository_rebaseline |
| Sequence | 216 |
| Dependencies | `frontend_106` complete |
| Status | Complete; inventory/design only |

## Objective

Inventory every retired-locale occurrence across contracts, source, schema, indexes, seeds, tests, snapshots, docs, and Agent Pack, then publish an exact dry-run migration design. Do not apply a migration or remove data.

## Readiness and dependencies

- Verify `frontend_106` and the ownership manifest before writing.
- Confirm the isolated non-production Mongo target and backup/restore evidence are available for any future apply; this task may report their absence but must not use Production.
- A record without a valid Arabic or English value is an approval blocker and must not be translated or fabricated.

## Allowed paths

Writes are limited to `agent_pack/03_execution/**`, `agent_pack/04_tracks/backend/G1_repository_rebaseline/backend_150.md`, `agent_pack/07_finish/backend_150/completion.json`, `agent_pack/08_reality_sync/BACKEND_150_RETIRED_LOCALE_INVENTORY_2026-08-30.json`, the additive superseding report `agent_pack/08_reality_sync/BACKEND_150_RETIRED_LOCALE_INVENTORY_2026-08-31.json`, and `agent_pack/scripts/**` only when directly required by the inventory. Repository source, database, tests, snapshots, and docs outside Agent Pack are read-only inputs.

## Forbidden paths and actions

- No `.env`, `.env.local`, `.env.production`, `.local/**`, `node_modules/**`, build output, credentials, or Production Mongo access. Only an isolated non-production Mongo read-only dry-run is permitted, with no raw document values, record IDs, or PII emitted.
- No `apps/**`, `packages/**`, `docs/**`, images, snapshots, locale deletion, index rebuild, database apply, external service, Git index, commit, push, deploy, reset, revert, stash, clean, deletion, or history rewrite.
- No automatic translation, invented copy, masks, crops, overlays, hidden regions, anti-alias masks, or nested agents.

## Ownership boundary

The Backend Coordinator owns only the exact Agent Pack outputs above. Existing product and data files remain user-owned or historical. No shared runtime writer is authorized.

## Implementation requirements

1. Inventory active and historical retired-locale references and classify each as runtime, data, index, fixture, evidence, or historical provenance.
2. Produce Mongo dry-run categories: valid AR/EN, retired locale with AR/EN, retired locale only, and unresolved/orphan records.
3. Record exact fields, indexes, collections, counts, hashes where safe, approval gates, and a migration checkpoint plan.
4. Keep the historical Agent Pack truth immutable and mark this report as a design/inventory result, not a migration completion.

## Database migration and rollback

No database mutation is permitted. The report must specify backup/restore commands, index-definition capture, batched checkpointing, orphan stop conditions, and exact rollback to the pre-migration fields/indexes for a later approved task.

## Focused verification

```powershell
node agent_pack/scripts/audit_pack.mjs
git diff --check
node agent_pack/scripts/backend_150_retired_locale_dry_run.mjs
```

Also run the repository-local locale occurrence audit and isolated Mongo dry-run only if the required non-Production target is already available. Missing commands are recorded as skipped, never passed.

## Evidence requirements

Publish the occurrence ledger, dry-run counts, exact target manifest, index impact, unresolved records, backup/restore prerequisites, approval IDs/placeholders, command exit codes, and a no-mutation report.

## Markers and stop

Success: `TASK_backend_150_COMPLETE`

Blocked: `TASK_backend_150_BLOCKED_DEPENDENCY`, `TASK_backend_150_BLOCKED_APPROVAL`, `TASK_backend_150_BLOCKED_OWNERSHIP`, `TASK_backend_150_BLOCKED_EXTERNAL`, or `TASK_backend_150_BLOCKED_VERIFICATION`.

Execute exactly one atomic task. Do not mark a migration applied. Do not commit, push, deploy, start another task, or use nested agents unless separately authorized. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
