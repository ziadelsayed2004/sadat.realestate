# backend_078 — SLA and Overdue Requests

| Field | Value |
|---|---|
| Track | backend |
| Phase | B5_requests_crm |
| Area | requests |
| Kind | api |
| Sequence | 66 / 208 |
| Depends on | `backend_077` |

## Goal

Implement configurable overdue rules, an idempotent job, and an administrative read model.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- `ADM-20`

## Allowed Roots

- `apps/api/src/modules/requests/**`
- `apps/api/tests/requests/**`
- `packages/contracts/src/requests/**`
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

Create `07_finish/backend_078/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
