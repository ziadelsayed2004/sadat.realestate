# backend_104 — Payment-Proof Review

| Field | Value |
|---|---|
| Track | backend |
| Phase | B7_ads_payments |
| Area | payments |
| Kind | security |
| Sequence | 82 / 198 |
| Depends on | `backend_103` |

## Goal

Implement approve and reject behavior with reasons, RBAC, idempotency, and audit.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- `ADM-35`
- `ADM-37`
- `ADM-38`

## Allowed Roots

- `apps/api/src/modules/payments/**`
- `apps/api/tests/payments/**`
- `packages/contracts/src/payments/**`
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

Create `07_finish/backend_104/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
