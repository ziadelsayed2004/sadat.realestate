# backend_148 — Public Listing Card Presentation Projection — PUB-02

| Field | Value |
|---|---|
| Track | backend |
| Phase | F7_post_release_assurance |
| Area | public listing parity |
| Kind | implementation |
| Sequence | 123 / 208 |
| Depends on | `backend_147` |

## Goal

Project publication-safe source, installment, promotion, and view metadata required by canonical PUB-02 cards.

## Allowed roots

- `packages/contracts/src/search/**`
- `apps/api/src/modules/search/**`
- `apps/api/tests/search/**`
- `apps/api/openapi/**`
- `apps/api/postman/**`
- `docs/api/public-properties-search.md`
- `agent_pack/01_product/API_ENDPOINT_BLUEPRINT.json`
- `agent_pack/**`

## Exact source

- Figma file: `Odl1Epn2u6lIEuIMmABT7o`
- PUB-02 node: `6017:12095`
- Runtime route: `/properties`

## Defect

Canonical cards expose source identity, installment and featured badges, and view counts, while the safe public projection omits part of that repository-owned presentation metadata.

## Acceptance criteria

- [x] Public cards safely project source image/type, installment availability, featured state, and view count.
- [x] Values derive from approved organizations, persisted payment plans, and active promotion records.
- [x] OpenAPI and focused search tests cover the additive fields.
- [x] Focused typecheck, lint, artifact, and pack checks pass.
