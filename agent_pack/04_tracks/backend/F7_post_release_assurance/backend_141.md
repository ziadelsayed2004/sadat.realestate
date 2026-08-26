# backend_141 — Public Figma Data Projection Repair — PUB-01, PUB-03, PUB-06

| Field | Value |
|---|---|
| Track | backend |
| Phase | F7_post_release_assurance |
| Area | public projection parity |
| Kind | implementation |
| Sequence | 116 / 208 |
| Depends on | `backend_140` |

## Goal

Expose the smallest existing, publication-safe data projections needed by the cached canonical PUB-01, PUB-03, and PUB-06 frames: active property categories and counts, published property features/services, and derived public developer statistics. Do not add private provider contact data or screenshot-only content.

## Allowed roots

- `packages/contracts/src/public/**`
- `packages/contracts/src/organizations/**`
- `apps/api/src/modules/public/**`
- `apps/api/src/modules/organizations/**`
- affected focused tests under `apps/api/src/**` and `packages/contracts/src/**`
- generated API artifacts required by the repository contract workflow
- `agent_pack/**`

## Acceptance criteria

- [ ] Homepage projection includes active property-type categories with localized labels, stable ordering, approved image URL when present, and published active property counts.
- [ ] Property details projection resolves active feature/service records referenced by the published property.
- [ ] Public developer profile includes publication-safe statistics derived from its published projects and active published properties.
- [ ] Existing clients remain compatible through additive fields and deterministic empty defaults.
- [ ] No private email, phone, or provider-account data is exposed.
- [ ] Focused contracts/API tests, affected typecheck, and affected lint pass.
- [ ] Completion evidence is valid and Agent Pack audit reports zero errors.

## Verification

- contracts build/typecheck and focused schema tests;
- focused homepage, property-details, and public-organization API tests;
- affected API typecheck and lint;
- `node agent_pack/scripts/audit_pack.mjs`.

