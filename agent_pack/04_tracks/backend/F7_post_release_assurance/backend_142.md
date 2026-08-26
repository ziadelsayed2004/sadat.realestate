# backend_142 — Public Homepage Metric Projection — PUB-01

| Field | Value |
|---|---|
| Track | backend |
| Phase | F7_post_release_assurance |
| Area | public homepage parity |
| Kind | implementation |
| Sequence | 117 / 208 |
| Depends on | `backend_141` |

## Goal

Add a publication-safe, localized homepage metric projection so PUB-01 can render the canonical population panel from deterministic API-backed data instead of unrelated entity counts or screenshot-only constants.

## Allowed roots

- `packages/contracts/src/public/**`
- `packages/contracts/src/contracts/**`
- `apps/api/src/modules/public/**`
- `apps/api/src/modules/database/seed.ts`
- focused API/contract tests
- `agent_pack/**`

## Acceptance criteria

- [ ] Homepage response includes stable, localized, nonnegative published metrics.
- [ ] Mongo projection reads only published visible metric records.
- [ ] Development seed provides deterministic canonical-compatible metrics without adding fake Production data.
- [ ] Existing homepage clients remain additive and deterministic.
- [ ] Focused build, typecheck, lint, tests, and Agent Pack audit pass.

