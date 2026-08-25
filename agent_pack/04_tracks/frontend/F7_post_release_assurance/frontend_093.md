# frontend_093 — Seeker Dashboard Design Parity Remediation

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | seeker UI |
| Kind | visual quality |
| Sequence | 193 / 198 |
| Depends on | `frontend_092` |

## Goal

Compare all Seeker dashboard screens with their approved local exports and repair material visual, state, data-binding, and interaction differences.

## Screen IDs

- All `SEK-*` entries from the canonical screen registry.

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- `01_product/SCREEN_COVERAGE.json`

## Allowed Roots

- `apps/web/src/features/seeker/**`
- `apps/web/src/features/design_system/**`
- `apps/web/src/features/frontend_foundation/**`
- `apps/web/tests/**`
- `packages/ui/**`
- `packages/contracts/**`
- `agent_pack/**`

## Acceptance Criteria

- [ ] Compare each Seeker screen against its exact approved local export.
- [ ] Use only safe seeker-owned API projections and never expose assignment, SLA, audit, internal notes, or private documents.
- [ ] Match approved layout, states, navigation, hierarchy, typography, spacing, and interaction behavior.
- [ ] Verify Arabic RTL plus English and Simplified Chinese LTR on the approved Desktop scope.
- [ ] Prove IDOR, permission, Loading, Empty, Error, Retry, Success, and Disabled behavior.
- [ ] Record direct comparison evidence and browser results for all selected screens.

## Verification

- targeted Vitest and Playwright suites
- direct design-to-runtime comparison evidence
- Web typecheck, lint, tests, and build

