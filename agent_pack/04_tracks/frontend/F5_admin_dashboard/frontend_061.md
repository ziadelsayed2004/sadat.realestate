# frontend_061 — Users, Seekers, Providers, and Verification

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F5_admin_dashboard |
| Area | admin_accounts |
| Kind | frontend |
| Sequence | 163 / 199 |
| Depends on | `frontend_060` |

## Goal

Implement administration, lists, details, and document review.

## Screen IDs

- `ADM-02`
- `ADM-03`
- `ADM-04`
- `ADM-05`

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- Screen ID `ADM-02` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `ADM-03` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `ADM-04` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `ADM-05` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.

## Allowed Roots

- `apps/web/src/features/admin_accounts/**`
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

Create `07_finish/frontend_061/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
