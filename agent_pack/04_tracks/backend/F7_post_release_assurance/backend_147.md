# backend_147 — Distinct Public Listing Rail and Filter Taxonomies — PUB-02

| Field | Value |
|---|---|
| Track | backend |
| Phase | F7_post_release_assurance |
| Area | public listing parity |
| Kind | implementation |
| Sequence | 122 / 208 |
| Depends on | `backend_146` |

## Goal

Expose distinct API-backed category-rail and property-type-filter facets required by canonical PUB-02.

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

The canonical horizontal category rail and sidebar property-type controls contain distinct taxonomies. Reusing one response collection for both forces incorrect labels/counts or screenshot-only hardcoding.

## Acceptance criteria

- [x] Public listing data returns bounded `categories` and `propertyTypes` facet arrays.
- [x] Both arrays come from active repository taxonomy records and retain published-property counts.
- [x] The category rail uses a strict category query resolved through active child property types.
- [x] OpenAPI and focused search tests cover the additive response.
- [x] Focused typecheck, lint, artifact, and pack checks pass.
