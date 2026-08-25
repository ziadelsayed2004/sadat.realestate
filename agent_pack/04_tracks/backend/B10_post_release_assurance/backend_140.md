# backend_140 - Native Non-Docker Local Runtime Recovery

| Field | Value |
|---|---|
| Track | backend |
| Phase | B10_post_release_assurance |
| Area | local runtime |
| Kind | infrastructure |
| Sequence | 115 / 199 |
| Depends on | `backend_138` |

## Goal

Replace the stale embedded-database local supervisor with a cross-platform Node.js runtime that uses an externally supplied non-production `MONGODB_URI`, truthful health and readiness, deterministic local seed data, and repository-owned process control.

## Source References

- `package.json`
- `.env.local.example`
- `scripts/native-local.mjs`
- `scripts/native-local-supervisor.mjs`
- `scripts/runtime-smoke.mjs`
- `02_architecture/ENVIRONMENT_MATRIX.md`
- `02_architecture/DEPLOYMENT_PLAN.md`

## Allowed Roots

- `package.json`
- `package-lock.json`
- `.env.local.example`
- `scripts/**`
- `apps/api/**`
- `apps/web/**`
- `README.md`
- `docs/operations/**`
- `docs/api/**`
- `docs/deployment/**`
- `agent_pack/**`

## Acceptance Criteria

- [x] Remove active Docker and embedded MongoDB assumptions from local startup; use `MONGODB_URI` for Local and Test.
- [x] Implement `local:doctor`, `local:prepare`, `local:up`, `local:status`, `local:seed`, `local:smoke`, and `local:down` as cross-platform repository-owned commands.
- [x] Make status and readiness perform real API and MongoDB liveness checks, report degraded database loss, prevent duplicate startup, and clean stale state.
- [x] Bound or rotate supervisor logs and stop only child processes started by this repository.
- [x] Make seed data deterministic and idempotent across the required non-production domain fixtures without private public-file URLs.
- [x] Verify populated homepage/API success, restart, shutdown, database-loss truthfulness, and two consecutive clean smoke passes.
- [x] Document local credentials and deterministic OTP behavior without exposing Production secrets.
- [x] Keep the local runtime, environment examples, health/readiness contracts, and Agent Pack evidence synchronized.

## Verification

- `npm run local:doctor`
- `npm run local:prepare`
- `npm run local:up`
- `npm run local:status`
- `npm run local:seed`
- `npm run local:smoke` twice from clean startup
- `npm run local:down`
- focused runtime and seed tests
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `node agent_pack/scripts/audit_pack.mjs`

Production deployment, real SMTP delivery, and remote VPS actions are outside this task and remain separately gated.
