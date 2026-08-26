# frontend_000 — Establish Vite SSR and Frontend Architecture

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F0_frontend_foundation |
| Area | frontend_foundation |
| Kind | infrastructure |
| Sequence | 125 / 208 |
| Depends on | `backend_138` |

## Goal

Prepare React, TypeScript, and Vite SSR for the public site with SPA dashboard shells and separate development and production builds.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`

## Allowed Roots

- `apps/web/src/features/frontend_foundation/**`
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

Create `07_finish/frontend_000/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
