# backend_146 — Property Delivery Status Contract and Public Filter — PUB-02

| Field | Value |
|---|---|
| Track | backend |
| Phase | F7_post_release_assurance |
| Area | public listing parity |
| Kind | implementation |
| Sequence | 121 / 208 |
| Depends on | `backend_145` |

## Goal

Persist and safely filter the delivery-status field required by canonical PUB-02.

## Allowed roots

- `packages/contracts/src/properties/**`
- `packages/contracts/src/search/**`
- `packages/contracts/src/contracts/index.ts`
- `apps/api/src/modules/properties/**`
- `apps/api/src/modules/search/**`
- `apps/api/tests/properties/**`
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

The canonical listing filter includes delivery status, but the property persistence, public projection, and search query contracts have no allowlisted field for it.

## Acceptance criteria

- [x] A strict property delivery-status enum is persisted through the details step.
- [x] Public list items project the field and the public search query filters it.
- [x] OpenAPI, Postman, and API inventory artifacts describe the additive field/query.
- [x] Focused contract, property/search, lint, artifact, and pack checks pass.
