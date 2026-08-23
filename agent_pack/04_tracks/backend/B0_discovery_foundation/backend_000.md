# backend_000 — Inventory Repository Truth and Lock Decisions

| Field | Value |
|---|---|
| Track | backend |
| Phase | B0_discovery_foundation |
| Area | discovery |
| Kind | discovery |
| Sequence | 1 / 197 |
| Depends on | None |

## Goal

Inspect the actual repository, record what exists and what is missing, lock assumptions and open decisions, and never claim that an unattached runtime exists.

## Screen IDs

- No direct screen; this task supports contracts, infrastructure, or cross-surface behavior.

## Source References

- `00_start_here/SOURCE_OF_TRUTH.md`
- `01_product/OPEN_QUESTIONS.md`

## Allowed Roots

- `package.json`
- `package-lock.json`
- `apps/api/**`
- `packages/contracts/**`
- `packages/config/**`
- `docs/**`
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

Create `07_finish/backend_000/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
