# frontend_094 — Provider Dashboard Design Parity Remediation

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | provider UI |
| Kind | visual quality |
| Sequence | 203 / 208 |
| Depends on | `frontend_093` |

## Goal

Compare all Provider dashboard screens with their approved local exports and repair material visual, state, workflow, upload, and interaction differences.

## Screen IDs

- All `PRV-*` entries from the canonical screen registry.

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- `01_product/SCREEN_COVERAGE.json`

## Allowed Roots

- `apps/web/src/features/provider/**`
- `apps/web/src/features/provider_auth/**`
- `apps/web/src/features/provider_property/**`
- `apps/web/src/features/design_system/**`
- `apps/web/src/features/frontend_foundation/**`
- `apps/web/tests/**`
- `packages/ui/**`
- `packages/contracts/**`
- `agent_pack/**`

## Acceptance Criteria

- [ ] Compare each Provider screen against its exact approved local export.
- [ ] Keep all property, project, request, advertising, payment-proof, commission, notification, and setting data owner-scoped.
- [ ] Keep private uploads private and exercise upload failure, scan, replay, and permission states.
- [ ] Match approved layout, states, navigation, hierarchy, typography, spacing, and interactions.
- [ ] Verify Arabic RTL plus English and Simplified Chinese LTR on the approved Desktop scope.
- [ ] Record direct comparison evidence and browser results for all selected screens.

## Verification

- targeted Vitest and Playwright suites
- Provider ownership/IDOR and private-file matrices
- direct design-to-runtime comparison evidence
- Web typecheck, lint, tests, and build

