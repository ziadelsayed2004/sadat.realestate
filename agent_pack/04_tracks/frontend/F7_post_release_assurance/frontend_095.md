# frontend_095 — Admin Dashboard Design Parity Remediation

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | admin UI |
| Kind | visual quality |
| Sequence | 195 / 199 |
| Depends on | `frontend_094` |

## Goal

Compare every locally exported Admin screen with its approved source and repair material visual, permission, data-density, workflow, and interaction differences.

## Screen IDs

- All locally exported `ADM-*` entries. ADM-54 direct-source recovery is owned by `frontend_096`.

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- `01_product/SCREEN_COVERAGE.json`

## Allowed Roots

- `apps/web/src/features/admin/**`
- `apps/web/src/features/admin_*/*`
- `apps/web/src/features/design_system/**`
- `apps/web/src/features/frontend_foundation/**`
- `apps/web/tests/**`
- `packages/ui/**`
- `packages/contracts/**`
- `agent_pack/**`

## Acceptance Criteria

- [ ] Compare every locally exported Admin screen against the exact approved source.
- [ ] Restore the approved information density, sections, tables, cards, filters, navigation, actions, and modal states instead of accepting simplified structural shells.
- [ ] Enforce server-provided permissions and available actions; View Only never mutates.
- [ ] Require reasons for sensitive actions and keep internal data inside Admin projections.
- [ ] Verify Arabic RTL plus English and Simplified Chinese LTR on the approved Desktop scope.
- [ ] Record direct comparison evidence and browser results for every selected screen.

## Verification

- targeted Vitest and Playwright suites
- Admin RBAC and permission matrix
- direct design-to-runtime comparison evidence
- Web typecheck, lint, tests, and build

