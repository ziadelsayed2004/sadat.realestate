# backend_145 — Public Listing Taxonomy Filter — PUB-02

| Field | Value |
|---|---|
| Track | backend |
| Phase | F7_post_release_assurance |
| Area | public listing parity |
| Kind | implementation |
| Sequence | 120 / 208 |
| Depends on | `backend_144` |

## Goal

Add the allowlisted property-type query needed by the canonical PUB-02 category and filter controls.

## Allowed roots

- `packages/contracts/src/search/**`
- `apps/api/src/modules/search/**`
- `apps/api/tests/search/**`
- `apps/web/src/features/public/listing-data.ts`
- `agent_pack/**`

## Exact source

- Figma file: `Odl1Epn2u6lIEuIMmABT7o`
- PUB-02 node: `6017:12095`
- Runtime route: `/properties`

## Defect

The response exposes public property-type facets, but the request contract cannot select a facet. The canonical category rail and filter chips therefore cannot complete their API-backed interaction.

## Acceptance criteria

- [x] `propertyTypeId` is strictly allowlisted and serialized.
- [x] Mongo applies it only to the published-active listing query.
- [x] Focused contract, API, route, lint, and pack checks pass.
