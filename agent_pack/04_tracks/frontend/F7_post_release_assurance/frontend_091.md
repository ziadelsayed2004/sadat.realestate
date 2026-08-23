# frontend_091 — Restore and Verify the Approved Design Source Bundle

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | design evidence |
| Kind | quality |
| Sequence | 190 / 197 |
| Depends on | `frontend_090` |

## Goal

Restore every previously supplied approved design artifact to its canonical repository path and verify it against the recorded SHA-256 manifest.

## Screen IDs

- Cross-surface design evidence for the canonical 131-screen registry.

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- `01_product/SCREEN_REGISTRY.json`
- `01_product/SCREEN_COVERAGE.json`

## Allowed Roots

- `docs/design_sources/**`
- `agent_pack/**`

## Acceptance Criteria

- [x] Restore all 130 locally exported screen sources without generating or redrawing any source.
- [x] Restore the developer handoff, prototype flow hub, brand system, logo, and supplementary source.
- [x] Verify every restored file against the existing SHA-256 manifest.
- [x] Preserve ADM-54 as external-only and do not fabricate a direct export.
- [x] Make the Agent Pack integrity audit pass with zero source errors.

## Verification

- `node agent_pack/scripts/audit_pack.mjs`
- `npm run test:vitest --workspace apps/web`
- source-manifest checksum verification

