# backend_019 — Account States and Restrictions

| Field | Value |
|---|---|
| Track | backend |
| Phase | B1_identity_access |
| Area | accounts |
| Kind | api |
| Sequence | 20 / 198 |
| Depends on | `backend_018` |

## Goal

Implement verify, reject, needs-information, suspend, and restrict actions with mandatory reasons and state-bypass prevention.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- `ADM-02`
- `ADM-03`
- `ADM-04`
- `ADM-06`
- `ADM-07`
- `ADM-08`

## Allowed Roots

- `apps/api/src/modules/accounts/**`
- `apps/api/tests/accounts/**`
- `packages/contracts/src/accounts/**`
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

Create `07_finish/backend_019/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
