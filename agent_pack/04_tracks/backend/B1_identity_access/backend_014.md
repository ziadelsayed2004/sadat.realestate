# backend_014 — Provider Types and Registration Application

| Field | Value |
|---|---|
| Track | backend |
| Phase | B1_identity_access |
| Area | provider |
| Kind | api |
| Sequence | 15 / 197 |
| Depends on | `backend_013` |

## Goal

Implement provider-type selection and a multi-step onboarding draft with Pending, Needs Information, Approved, and Rejected states.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- `AUTH-07`
- `AUTH-08`
- `AUTH-09`
- `AUTH-10`
- `AUTH-11`
- `AUTH-13`
- `AUTH-14`
- `AUTH-15`
- `AUTH-16`
- `AUTH-17`

## Allowed Roots

- `apps/api/src/modules/provider/**`
- `apps/api/tests/provider/**`
- `packages/contracts/src/provider/**`
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

Create `07_finish/backend_014/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
