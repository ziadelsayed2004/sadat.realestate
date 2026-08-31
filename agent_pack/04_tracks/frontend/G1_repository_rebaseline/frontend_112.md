# frontend_112 - Documentation Image Inventory, External Artifact Bundle, Ignore Policy and Approval Manifest

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G1_repository_rebaseline |
| Sequence | 217 |
| Dependencies | `frontend_106` complete |
| Status | Complete; inventory/design only |

## Objective

Inventory the scoped documentation images and define durable external evidence, image-only ignore policy, restore/verify commands, and approval manifests without deleting, untracking, or uploading anything.

## Readiness and dependencies

- Verify the dated ownership manifest and `frontend_106` completion evidence.
- Count exactly 135 images under `docs/design_sources/final_screens/**` and 1,182 under `docs/quality/**` using an exact target list; identify the three excluded brand assets and all runtime assets.
- External artifact publication, `.gitignore` changes, index-only untracking, and deletion are later separate approval-gated tasks.

## Allowed paths

Writes are limited to `agent_pack/03_execution/**`, `agent_pack/04_tracks/frontend/G1_repository_rebaseline/frontend_112.md`, `agent_pack/07_finish/frontend_112/completion.json`, `agent_pack/08_reality_sync/FRONTEND_112_VISUAL_ARTIFACT_INVENTORY_2026-08-30.json`, and `agent_pack/scripts/**` only for bounded inventory/verification tooling. Scoped image files and `.gitignore` are read-only inputs.

## Forbidden paths and actions

- No `.env`, `.env.local`, `.env.production`, `.local/**`, credentials, runtime assets, brand assets, snapshots, or build output reads beyond required metadata.
- No `docs/**` image mutation, deletion, untracking, `.gitignore` edit, external artifact upload, Git index operation, commit, push, deploy, reset, revert, stash, clean, broad glob, or history rewrite.
- No masks, crops, overlays, hidden regions, anti-alias masks, invented provenance, or nested agents.

## Ownership boundary

The Frontend Coordinator owns only the exact Agent Pack outputs above. Visual files are evidence inputs and remain user-owned/historical. No product or documentation writer is authorized.

## Implementation requirements

1. Record exact path, extension, SHA-256, bytes, dimensions, source type, canonical Figma file/node where applicable, capture time, and provenance.
2. Produce a signed target list and an explicit exclusion list for brand/runtime assets.
3. Define an encrypted/versioned bundle manifest, external read-only storage boundary, scoped CI restore, Hostinger backup/restore proof, and deterministic PowerShell restore/verify commands.
4. State that ignore rules and index-only untracking do not shrink existing Git history or clone size.
5. Keep runtime regression snapshots separate from canonical Figma parity evidence.

## Migration and rollback

No file, Git index, or external artifact mutation is permitted. The report must specify exact backup, restore, hash, dimension, and dry-run gates for later upload, ignore, untracking, and deletion tasks. No broad restore or deletion command may be proposed as an applied action.

## Focused verification

```powershell
git status --short
git diff --check
node agent_pack/scripts/audit_pack.mjs
```

Run only bounded inventory and manifest-schema checks. A missing artifact service is recorded as a readiness gap, not passed as durable evidence.

## Evidence requirements

Publish the 1,317-file target/exclusion ledger, hashes/dimensions/provenance, bundle schema, restore/verify command contract, fresh-clone/CI behavior, backup proof requirements, and explicit no-delete/no-untrack result.

## Markers and stop

Success: `TASK_frontend_112_COMPLETE`

Blocked: `TASK_frontend_112_BLOCKED_DEPENDENCY`, `TASK_frontend_112_BLOCKED_APPROVAL`, `TASK_frontend_112_BLOCKED_OWNERSHIP`, `TASK_frontend_112_BLOCKED_EXTERNAL`, or `TASK_frontend_112_BLOCKED_VERIFICATION`.

Execute exactly one atomic task. Do not start G2, edit `.gitignore`, untrack images, upload artifacts, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.

## Completion handoff

- Evidence: `agent_pack/08_reality_sync/FRONTEND_112_VISUAL_ARTIFACT_INVENTORY_2026-08-30.json`.
- The exact inventory is 135 final-screen images plus 1,182 quality images, with no missing hashes, dimensions, provenance, or duplicate paths.
- The ownership manifest classifies the prospective generated views as `HISTORICAL`; `sync_pack.mjs` was therefore not run and those views were not modified.
- The external artifact service remains unconfigured; no bundle was created or uploaded. Image deletion, image untracking, `.gitignore` edits, and history reduction remain separately approval-gated.
