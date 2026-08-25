# backend_113 — Commission Policy Resolver and Snapshot

| Field | Value |
|---|---|
| Track | backend |
| Phase | B8_commissions |
| Area | commissions |
| Kind | architecture |
| Sequence | 90 / 198 |
| Depends on | `backend_112` |

## Goal

Resolve the effective policy deterministically and save a snapshot at the approved commercial event after that event is defined.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- Product requirements, architecture guidance, and directly related runtime contracts.

## Allowed Roots

- `apps/api/src/modules/commissions/**`
- `apps/api/tests/commissions/**`
- `packages/contracts/src/commissions/**`
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

Create `07_finish/backend_113/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
