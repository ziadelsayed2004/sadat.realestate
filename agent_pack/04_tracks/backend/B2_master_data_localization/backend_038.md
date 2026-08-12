# backend_038 — Homepage and Display Management

| Field | Value |
|---|---|
| Track | backend |
| Phase | B2_master_data_localization |
| Area | cms |
| Kind | api |
| Sequence | 30 / 188 |
| Depends on | `backend_037` |

## Goal

Implement homepage sections, ordering, visibility, and display settings with safe preview behavior.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- `ADM-49`
- `ADM-58`

## Allowed Roots

- `apps/api/src/modules/cms/**`
- `apps/api/tests/cms/**`
- `packages/contracts/src/cms/**`
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

Create `07_finish/backend_038/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
