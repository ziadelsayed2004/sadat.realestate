# backend_149 — Public Property Detail Canonical Projection — PUB-03

| Field | Value |
|---|---|
| Status | In Progress |
| Sequence | 124 / 208 |
| Owner | Backend |
| Parent | frontend_099 |

## Goal

Project publication-safe source identity and canonical feature/service presentation metadata required by PUB-03 without screenshot-only or production-fake data.

## Dependencies

- backend_148
- Canonical clone `Odl1Epn2u6lIEuIMmABT7o`, node `6017:12693`

## Allowed roots

- `packages/contracts/src/public/**`
- `apps/api/src/modules/public/**`
- `apps/api/tests/public/**`
- `apps/web/tests/e2e/public-fixtures.ts`
- API specification artifacts
- `agent_pack/**`

## Acceptance

- Public details safely expose approved source name/image/verification.
- Feature/service entries may expose localized detail and distance labels.
- Repository reads only approved/published source records.
- Contracts, API tests, API artifacts, lint, and Agent Pack audit pass.

## Verification

- Contracts build
- API typecheck
- Focused public property tests
- Affected lint
- OpenAPI/Postman validation
- Agent Pack audit
