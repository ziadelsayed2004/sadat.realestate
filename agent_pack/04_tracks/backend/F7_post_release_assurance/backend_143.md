# backend_143 — Public Homepage Banner Content Projection — PUB-01

| Field | Value |
|---|---|
| Track | backend |
| Phase | F7_post_release_assurance |
| Area | public homepage parity |
| Kind | implementation |
| Sequence | 118 / 208 |
| Depends on | `backend_142` |

## Goal

Add the publication-safe localized banner copy projection needed to render the canonical PUB-01 promotional banner from deterministic API-backed content.

## Allowed roots

- `packages/contracts/src/public/**`
- `packages/contracts/src/contracts/**`
- `apps/api/src/modules/public/**`
- `apps/api/src/modules/database/seed.ts`
- `apps/api/tests/public/**`
- `apps/web/tests/e2e/public-fixtures.ts`
- `agent_pack/**`

## Exact source

- Figma file: `Odl1Epn2u6lIEuIMmABT7o`
- PUB-01 node: `6017:10847`
- Runtime route: `/`

## Defect

The published homepage banner projection exposes title/media/target only. The canonical promotional card also requires localized eyebrow, body, and highlight copy; the frontend cannot render those regions through the real API contract.

## Acceptance criteria

- [x] Public homepage banner schema additively supports localized eyebrow, body, and highlight fields.
- [x] Mongo reads and projects only fields from published active banners.
- [x] Deterministic non-production fixtures and seed data exercise the projection.
- [x] No screenshot-only UI literals or fake Production data are introduced.
- [x] Contract build, API typecheck, focused homepage tests, affected lint, and Agent Pack audit pass.
