# frontend_034 — Seeker Notifications

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F3_seeker_dashboard |
| Area | seeker |
| Kind | frontend |
| Sequence | 147 / 199 |
| Depends on | `frontend_033` |

## Goal

Implement inbox, unread counts, mark-as-read, and deep links.

## Screen IDs

- `SEK-07`

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- Screen ID `SEK-07` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.

## Allowed Roots

- `apps/web/src/features/seeker/**`
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

Create `07_finish/frontend_034/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
