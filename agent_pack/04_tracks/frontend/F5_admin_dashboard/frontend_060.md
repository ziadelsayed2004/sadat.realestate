# frontend_060 — Admin Shell and Overview

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F5_admin_dashboard |
| Area | admin |
| Kind | frontend |
| Sequence | 161 / 197 |
| Depends on | `frontend_051` |

## Goal

Implement the desktop layout, navigation, overview, and permission gating.

## Screen IDs

- `ADM-01`

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- Screen ID `ADM-01` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.

## Allowed Roots

- `apps/web/src/features/admin/**`
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

Create `07_finish/frontend_060/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
