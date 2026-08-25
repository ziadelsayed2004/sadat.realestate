# frontend_017 — About Platform and Team

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F1_public_site |
| Area | content |
| Kind | frontend |
| Sequence | 133 / 199 |
| Depends on | `frontend_016` |

## Goal

Implement both pages using published CMS content.

## Screen IDs

- `PUB-11`
- `PUB-12`

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- Screen ID `PUB-11` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `PUB-12` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.

## Allowed Roots

- `apps/web/src/features/content/**`
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

Create `07_finish/frontend_017/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
