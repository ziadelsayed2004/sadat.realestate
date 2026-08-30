# frontend_119 - Full AR/EN 131-Screen Matrix

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G5_figma_closure |
| Sequence | 238 |
| Dependencies | `frontend_118` complete |
| Status | Open |

## Objective

Publish one complete Arabic/English and approved-device ledger for all 131 screens, independently reporting runtime regression stability and direct canonical Figma parity.

## Readiness and dependencies

- Verify all surface parity tasks, artifact restore/verify, deterministic fixtures/fonts, route registry, and role/session prerequisites.
- Do not close a screen through a snapshot pass alone; direct Figma evidence and human review are separate requirements.

## Allowed paths

Writes are limited to `apps/web/tests/**`, `apps/api/tests/**` only for bounded matrix harness changes, `docs/quality/figma_parity/**` tracked ledgers/reviews/metrics, bounded `scripts/**`, and Agent Pack files. Canonical images are restored evidence inputs only.

## Forbidden paths and actions

- No product redesign, unapproved implementation repair, `.env*`, `.local/**`, images, masks, crops, overlays, hidden regions, anti-alias masks, `--ignore-snapshots`, unreviewed snapshot update, Git index, database, commit, push, deploy, reset, revert, stash, clean, or nested agents.

## Ownership boundary

The Matrix Coordinator owns the ledger and harness only. Feature fixes require a new bounded task; external/source exceptions remain owned and explicit.

## Implementation requirements

1. Cover all 131 screens with Screen ID, surface, route, role, node, source/runtime provenance, device, AR/EN evidence, state, fixture/API, loading/empty/error/retry/success, accessibility, interaction, regression, parity, defect, blocker, owner, and next task.
2. Use raw transparent geometry/pixel/typography metrics and direct human review without masking.
3. Separate `regressionStatus`, `figmaParityStatus`, and `sourceType`; do not convert local export into historical Figma claim.
4. Run no-update runtime snapshots independently and do not use `--ignore-snapshots`.

## Migration and rollback

No database migration. Restore the exact prior ledger/harness files if validation fails; do not alter screen implementation or delete evidence in this matrix task.

## Focused verification

```powershell
npm.cmd run visual-evidence:restore -- --version <bundleVersion>
npm.cmd run visual-evidence:verify -- --version <bundleVersion>
npm.cmd run test:visual --workspace apps/web
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run the approved 131-screen AR/EN matrix only after focused lanes are green; do not update snapshots.

## Evidence requirements

Publish machine-readable and Arabic human-readable matrices, counts, raw metrics, direct-review records, regression results, external blockers, owner/next-task mapping, and source-type distinctions.

## Markers and stop

Success: `TASK_frontend_119_COMPLETE`

Blocked: `TASK_frontend_119_BLOCKED_FIGMA_ACCESS`, `TASK_frontend_119_BLOCKED_SOURCE`, `TASK_frontend_119_BLOCKED_MATRIX`, `TASK_frontend_119_BLOCKED_OWNERSHIP`, or `TASK_frontend_119_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_120, repair product code inside the matrix, update snapshots without review, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
