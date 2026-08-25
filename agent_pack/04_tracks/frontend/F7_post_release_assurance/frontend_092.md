# frontend_092 — Public and Authentication Design Parity Remediation

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | public and authentication UI |
| Kind | visual quality |
| Sequence | 192 / 199 |
| Depends on | `frontend_091` |

## Goal

Compare every Public and Authentication runtime screen with its approved local export and repair material layout, content, state, responsive, and interaction differences.

## Screen IDs

- All `PUB-*` and `AUTH-*` entries from the canonical screen registry.

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- `01_product/SCREEN_COVERAGE.json`

## Allowed Roots

- `apps/web/src/features/public/**`
- `apps/web/src/features/auth/**`
- `apps/web/src/features/community/**`
- `apps/web/src/features/content/**`
- `apps/web/src/features/design_system/**`
- `apps/web/src/features/frontend_foundation/**`
- `apps/web/tests/**`
- `packages/ui/**`
- `packages/contracts/**`
- `agent_pack/**`

## Acceptance Criteria

- [ ] Compare each screen against the exact approved local source, not against an existing runtime snapshot.
- [ ] Render populated success-state fixtures through implemented API contracts; an error-state baseline must not count as success-state visual evidence.
- [ ] Match the approved layout, hierarchy, spacing, typography, colors, imagery, controls, and states within a documented visual threshold.
- [ ] Verify Arabic RTL plus English and Simplified Chinese LTR.
- [ ] Verify Desktop, Tablet, and Mobile for Public and Authentication surfaces.
- [ ] Preserve Loading, Empty, Error, Retry, Success, Disabled, and permission behavior separately.
- [ ] Update visual, interaction, accessibility, and route tests without inventing Product behavior.

## Verification

- targeted Vitest and Playwright suites
- direct design-to-runtime image comparison evidence for every selected screen
- `npm run typecheck --workspace apps/web`
- `npm run lint --workspace apps/web`
- `npm run test --workspace apps/web`
- `npm run build --workspace apps/web`

