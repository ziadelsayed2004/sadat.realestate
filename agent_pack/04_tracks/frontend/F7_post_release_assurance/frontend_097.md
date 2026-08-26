# frontend_097 — Full Success-State Browser and Defect-Closure Matrix

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | release assurance |
| Kind | quality |
| Sequence | 206 / 208 |
| Depends on | `frontend_095` |

## Goal

Run an observable unfiltered browser matrix for all canonical routes and close every material visual, accessibility, locale, performance, and session-security defect.

## Screen IDs

- Cross-surface matrix for all 131 canonical screens.

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- `01_product/SCREEN_COVERAGE.json`
- `08_reality_sync/PLATFORM_COMPLETION_AUDIT.json`

## Allowed Roots

- `apps/web/**`
- `packages/ui/**`
- `packages/contracts/**`
- `agent_pack/**`

## Acceptance Criteria

- [ ] Make the visual command include every intended visual spec instead of only one public spec.
- [ ] Use populated test-only fixtures through implemented API contracts for success-state screenshots; keep error-state baselines separate.
- [ ] Run all route/locale/device cases with progress reporting and deterministic timeouts.
- [ ] Run the complete visual, accessibility, critical journey, unfiltered E2E, performance, browser/session security, and data-binding matrices.
- [ ] Close every Severity 1/2 defect and record remaining lower-severity debt honestly.
- [ ] Prove bundle budgets or implement justified code splitting for oversized production chunks.
- [ ] Record exact commands, exit codes, screenshots, traces, and environment prerequisites.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:e2e --workspace apps/web`
- `npm run test:visual --workspace apps/web`
- `npm run test:a11y --workspace apps/web`
- performance and browser/session security matrices
- `node agent_pack/scripts/audit_pack.mjs`

A compatible Playwright browser is mandatory. Missing browser binaries are Blocked, not Passed.

