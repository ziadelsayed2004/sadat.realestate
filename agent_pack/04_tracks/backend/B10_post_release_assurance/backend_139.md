# backend_139 — Live Production-Parity Infrastructure and API Assurance

| Field | Value |
|---|---|
| Track | backend |
| Phase | B10_post_release_assurance |
| Area | release assurance |
| Kind | quality |
| Sequence | 114 / 198 |
| Depends on | `backend_138` |

## Goal

Prove the live non-production API and infrastructure boundaries that repository-only tests cannot prove, without using Production data or credentials.

## Screen IDs

- No direct screen; this task covers live backend and infrastructure assurance.

## Source References

- `08_reality_sync/FINAL_RELEASE_MANIFEST.json`
- `08_reality_sync/PLATFORM_COMPLETION_AUDIT.json`
- `02_architecture/ENVIRONMENT_MATRIX.md`
- `02_architecture/DEPLOYMENT_PLAN.md`

## Allowed Roots

- `apps/api/**`
- `packages/contracts/**`
- `packages/config/**`
- `docs/api/**`
- `docs/operations/**`
- `agent_pack/**`

## Acceptance Criteria

- [ ] Use an isolated non-production MongoDB replica set and run the live integration, transaction, migration, index, seed, backup, and restore matrix.
- [ ] Configure approved non-production private storage, malware scanning, OTP, monitoring, and scheduling providers and prove fail-closed readiness.
- [ ] Run the complete positive, negative, RBAC, ownership/IDOR, validation, state, upload, replay, concurrency, and journey matrix for every implemented route.
- [ ] Run checked-in native Ubuntu service artifacts with health, readiness, graceful shutdown, and rollback evidence.
- [ ] Produce external security-assurance evidence without claiming Production penetration testing unless it actually occurred.
- [ ] Keep runtime inventory, OpenAPI, Postman, environment examples, and evidence synchronized.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run api:inventory`
- `npm run openapi:validate`
- `npm run postman:validate`
- live API, transaction, provider, native infrastructure, backup/restore, and security matrices
- `node agent_pack/scripts/audit_pack.mjs`

This task is blocked until all external prerequisites are available. Missing infrastructure is never reported as Passed.
