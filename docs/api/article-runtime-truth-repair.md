# Article Runtime Truth Repair

Date: 2026-08-17

## Repaired truth

The previous repository state marked `backend_090`, `backend_091`, and `backend_092` complete while their completion notes explicitly deferred HTTP route wiring. That gap caused `frontend_015` to remain partial even though its article UI and visual coverage existed.

The repository now contains one connected Article runtime:

- strict shared category/article mutation and response contracts;
- strict Mongoose category/article models with optimistic versions and query-driven indexes;
- Mongoose and deterministic in-memory repositories;
- API-side RBAC, active-category checks, state transitions, bounded audit snapshots, and explicit public projections;
- eleven Express route definitions mounted under `/api/v1` exactly once;
- runtime bootstrap from the real database, token, audit, and RBAC dependencies;
- matching OpenAPI and Postman route sets plus public Postman journeys;
- service, model/index, HTTP authorization, validation, state, replay, masking, and frontend-adapter tests;
- frontend category metadata loading with the embedded public category projection as a safe fallback.

## Static verification completed in this repair environment

- Node.js `v24.19.0` and npm `11.9.0` match the declared engine range.
- All changed TypeScript and TSX files passed TypeScript parser/transpile syntax diagnostics.
- All changed non-TSX TypeScript files passed Node's type-stripping syntax check.
- Focused unused-variable linting passed for every changed TypeScript/TSX file.
- Workspace policy checks passed, including all 13 workspace-policy tests.
- Static runtime definitions, OpenAPI, and the main Postman collection contain the same 112 unique method/path pairs; the Article module contributes exactly eleven.
- All changed JSON files parse, every OpenAPI local reference resolves, and the Agent Pack audit is clean.

## Mandatory execution gate still required

This sandbox does not contain `node_modules`, and its network-approval policy rejected `npm ci` before npm could execute, including offline mode. Therefore the modified source has not been claimed to pass the current full typecheck, repository lint, API/Web tests, build, dependency audit, live MongoDB checks, or browser matrix in this environment.

In an environment with dependency installation access, run from the repository root:

```bash
npm ci
npm run quality
```

Then run the targeted article and frontend gates if a focused diagnosis is needed:

```bash
npm run typecheck --workspace apps/api
npm run test:unit --workspace apps/api
npm run test:api --workspace apps/api
npm run typecheck --workspace apps/web
npm run test --workspace apps/web
npm run build
npm run api:inventory
npm run openapi:validate
npm run postman:validate
node agent_pack/scripts/audit_pack.mjs
```

No live MongoDB or external-provider result is implied. Transaction-dependent live verification still requires an isolated non-production replica set and safe cleanup prerequisites.
