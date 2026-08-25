# frontend_043 — Add Property: Details, Price, and Features

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F4_provider_dashboard |
| Area | provider_property |
| Kind | frontend |
| Sequence | 153 / 198 |
| Depends on | `frontend_042` |

## Goal

Implement wizard steps 03 through 05 with conditional validation.

## Screen IDs

- `PRV-05`
- `PRV-06`
- `PRV-07`

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- Screen ID `PRV-05` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `PRV-06` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `PRV-07` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.

## Allowed Roots

- `apps/web/src/features/provider_property/**`
- `apps/web/src/routes/**`
- `apps/web/tests/**`
- `packages/ui/**`
- `packages/contracts/**`
- `agent_pack/**`

Any file outside these roots requires an explicit necessity note in completion evidence. Never expand scope silently.

## Acceptance Criteria

- [ ] Inspect the current runtime and never replace existing truth with an assumption.
- [ ] Implement only the selected scope and document every unresolved dependency or decision.
- [ ] Do not introduce secrets, production data, or unsupported claims.
- [ ] Match every selected Screen ID to its approved frame and record the exact reference in evidence.
- [ ] Use implemented backend contracts only; production mocks and invented endpoints are forbidden.
- [ ] Complete applicable Loading, Empty, Error, Retry, Success, and permission variants.
- [ ] Verify Arabic RTL plus every other supported locale, direction, approved device scope, and applicable UI tests.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `targeted Playwright/visual/a11y checks`

A missing command or prerequisite is recorded as `Blocked — prerequisites unavailable`; it is never reported as Passed.

## Finish

Create `07_finish/frontend_043/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
