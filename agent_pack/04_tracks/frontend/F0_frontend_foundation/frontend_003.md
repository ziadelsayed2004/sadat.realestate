# frontend_003 — Shells, Routes, and Error Boundaries

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F0_frontend_foundation |
| Area | routing |
| Kind | frontend |
| Sequence | 128 / 208 |
| Depends on | `frontend_002` |

## Goal

Implement Public, Seeker, Provider, and Admin shells with route guards, 404/403 pages, and error boundaries.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`

## Allowed Roots

- `apps/web/src/features/routing/**`
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

Create `07_finish/frontend_003/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
