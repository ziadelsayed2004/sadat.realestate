# backend_061 — Public Property Listing, Search, and Filters

| Field | Value |
|---|---|
| Track | backend |
| Phase | B4_public_seeker |
| Area | search |
| Kind | api |
| Sequence | 49 / 197 |
| Depends on | `backend_060` |

## Goal

Implement public listing with pagination, filters, sorting, search, totals, a query allowlist, and operator-injection prevention.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- `PUB-02`

## Allowed Roots

- `apps/api/src/modules/search/**`
- `apps/api/tests/search/**`
- `packages/contracts/src/search/**`
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

Create `07_finish/backend_061/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
