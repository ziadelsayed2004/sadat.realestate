# backend_066 — Seeker Overview

| Field | Value |
|---|---|
| Track | backend |
| Phase | B4_public_seeker |
| Area | seeker |
| Kind | api |
| Sequence | 54 / 198 |
| Depends on | `backend_065` |

## Goal

Provide summaries of requests, viewings, saved properties, and notifications using real data only.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- `SEK-01`

## Allowed Roots

- `apps/api/src/modules/seeker/**`
- `apps/api/tests/seeker/**`
- `packages/contracts/src/seeker/**`
- `docs/api/**`
- `apps/api/openapi/**`
- `apps/api/postman/**`
- `agent_pack/**`

Any file outside these roots requires an explicit necessity note in completion evidence. Never expand scope silently.

## Acceptance Criteria

- [ ] Inspect the current runtime and never replace existing truth with an assumption.
- [ ] Implement only the selected scope and document every unresolved dependency or decision.
- [ ] Do not introduce secrets, production data, or unsupported claims.
- [ ] Keep contracts, validation, error codes, permissions, ownership, and runtime behavior synchronized.
- [ ] Add applicable positive, negative, authorization, validation, and state-transition tests.
- [ ] Update OpenAPI, Postman, and runtime API inventory when routes or DTOs change.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test -- --runInBand`
- `npm run build`
- `npm audit --audit-level=high`
- `route/OpenAPI/Postman checks when applicable`

A missing command or prerequisite is recorded as `Blocked — prerequisites unavailable`; it is never reported as Passed.

## Finish

Create `07_finish/backend_066/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
