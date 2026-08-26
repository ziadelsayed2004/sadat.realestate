# backend_144 — Public Listing Facets and Card Metadata Projection — PUB-02

| Field | Value |
|---|---|
| Track | backend |
| Phase | F7_post_release_assurance |
| Area | public listing parity |
| Kind | implementation |
| Sequence | 119 / 208 |
| Depends on | `backend_143` |

## Goal

Add the publication-safe listing facets and card metadata needed to render canonical PUB-02 through the real API contract.

## Allowed roots

- `packages/contracts/src/search/**`
- `packages/contracts/src/public/**`
- `apps/api/src/modules/search/**`
- `apps/api/tests/search/**`
- `apps/web/tests/e2e/public-fixtures.ts`
- `agent_pack/**`

## Exact source

- Figma file: `Odl1Epn2u6lIEuIMmABT7o`
- PUB-02 node: `6017:12095`
- Runtime route: `/properties`

## Defect

The public list response contains only items and pagination. The canonical screen requires a taxonomy/category rail with counts and publication-safe card context. The frontend cannot render those regions from the real API contract.

## Acceptance criteria

- [x] Public listing schema additively supports category facets with deterministic counts.
- [x] Public listing items additively expose location and source metadata from active/approved persisted records, while optional code and view-count fields remain available for persisted sources.
- [x] Mongo reads only published active properties and approved public source records.
- [x] Deterministic non-production fixtures exercise the projection.
- [x] No screenshot-only literals or fake Production data are introduced.
- [x] Contract build, API typecheck, focused search tests, affected lint, and Agent Pack audit pass.
