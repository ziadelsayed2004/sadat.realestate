# frontend_114 - Authenticated Canonical Figma Refresh and Source Closure

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G5_figma_closure |
| Sequence | 233 |
| Dependencies | `frontend_113` and `backend_159` complete |
| Status | Open |

## Objective

Refresh authenticated visual evidence only from canonical Figma, hydrate verified artifacts, and classify source availability for all open parity cases without changing product code or claiming local exports are historical Figma evidence.

## Readiness and dependencies

- Verify the G4 CSS/API/infrastructure gates and durable artifact bundle restore/verify evidence.
- Use only Figma file `Odl1Epn2u6lIEuIMmABT7o`; the file `0HBdTNGROmmpC6S7OYa3iJ` is forbidden.
- Do not recapture or retune screens in this source-refresh task; record missing access or source as an honest blocker.

## Allowed paths

Writes are limited to `docs/quality/figma_parity/**` non-image manifests/reviews/metrics, bounded `scripts/**`, restored evidence files only when already approved, and exact Agent Pack task/evidence/state files. Application code, design sources, images, snapshots, and runtime assets are read-only inputs here.

## Forbidden paths and actions

- No forbidden Figma retrieval, invented nodes/assets/data, masks, crops, overlays, hidden regions, anti-alias masks, snapshot updates, `--ignore-snapshots`, product repair, image deletion, Git index, database, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No secrets, PII, arbitrary local-only evidence, or nested agents.

## Ownership boundary

The Coordinator owns evidence manifests and reviews. Feature implementation remains protected for later parity tasks; external Figma/artifact services remain evidence boundaries.

## Implementation requirements

1. Record canonical node/frame/prototype IDs, source hash, artifact hash/dimensions, route, role, locale, direction, viewport, capture time, and provenance.
2. Hydrate and verify the external bundle before parity comparisons; fail closed on missing or drifting artifacts.
3. Separate regression snapshot evidence from direct canonical parity evidence and retain all 29 exception owners.
4. Require direct human review and transparent raw geometry/pixel/typography metrics; no visual masking.

## Migration and rollback

No database or product migration. Restore the exact prior evidence manifest/review from the approved bundle if validation fails; no deletion or broad restore is allowed.

## Focused verification

```powershell
npm.cmd run visual-evidence:restore -- --version <bundleVersion>
npm.cmd run visual-evidence:verify -- --version <bundleVersion>
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run authenticated source review and manifest/hash/dimension validation only; do not run the full screen matrix here.

## Evidence requirements

Publish canonical source links/IDs, hydrated artifact hashes/dimensions, access result, raw metric schema, reviewer, open exception list, and a clear separation of regression and parity status.

## Markers and stop

Success: `TASK_frontend_114_COMPLETE`

Blocked: `TASK_frontend_114_BLOCKED_FIGMA_ACCESS`, `TASK_frontend_114_BLOCKED_SOURCE`, `TASK_frontend_114_BLOCKED_EXTERNAL_ARTIFACT`, `TASK_frontend_114_BLOCKED_OWNERSHIP`, or `TASK_frontend_114_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_115, modify product code, update snapshots, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
