# backend_157 - Planned-API Revalidation, Required Route Completion, Shared Rate Limits and Bounded Queries

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G4_platform_hardening |
| Sequence | 229 |
| Dependencies | `backend_156` and `frontend_111` complete |
| Status | Open |

## Objective

Revalidate every planned API against active requirements, implement only genuinely required routes, mark obsolete routes RETIRED with evidence, and harden shared rate limits and bounded queries.

## Readiness and dependencies

- Verify G3 request/CRM behavior, active product requirements, route consumers, auth/RBAC, and current API inventory.
- The nine existing planned routes require individual REQUIRED, RETIRED, or BLOCKED_PRODUCT decisions; do not force planned=0.

## Allowed paths

Writes are limited to affected `apps/api/src/**`, `apps/api/tests/**`, `packages/contracts/**`, `apps/api/openapi/**`, `apps/api/postman/**`, `agent_pack/01_product/API_ENDPOINT_BLUEPRINT.json`, and exact Agent Pack evidence/state files.

## Forbidden paths and actions

- No `.env*`, `.local/**`, production data, SMTP sends, Figma evidence, images, snapshots, phone-auth fallback, unrelated routes, Git index, commit, push, deploy, reset, revert, stash, clean, deletion, or history rewrite.
- No dead route stubs, arbitrary filters/sorts, in-memory production rate limits, client-trusted metadata, or nested agents.

## Ownership boundary

Backend owns API decision records, required route changes, shared security/query behavior, artifacts, and tests. Frontend/CSS work is separate.

## Implementation requirements

1. Record source requirement, consumer, auth/RBAC, request/response, security/pagination, migration impact, retirement evidence, and owner approval for all nine routes.
2. Implement REQUIRED routes only; do not create runtime routes for RETIRED entries.
3. Add Mongo-backed rate limiting for public/Auth writes, body limits, generic errors, no enumeration, allowlisted pagination/filter/sort, explain-backed indexes, and log redaction.
4. Synchronize runtime, contracts, OpenAPI, Postman, and inventory.

## Migration and rollback

Use backward-compatible route/schema changes after dry-run. Rollback restores the prior route/spec contract and disables only the bounded feature; RETIRED evidence remains historical and no dead route is restored without requirement proof.

## Focused verification

```powershell
npm.cmd run api:inventory
npm.cmd run api:audit
npm.cmd run openapi:validate
npm.cmd run postman:validate
npm.cmd run test:security
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run rate-limit concurrency, pagination/filter/sort, auth/RBAC/IDOR, generic-error, route-consumer, and required/retired decision tests.

## Evidence requirements

Publish nine decision records, required/retired totals, route/consumer inventory, explain plans, concurrency results, artifact hashes, approvals, and rollback evidence.

## Markers and stop

Success: `TASK_backend_157_COMPLETE`

Blocked: `TASK_backend_157_BLOCKED_PRODUCT_REQUIREMENT`, `TASK_backend_157_BLOCKED_RBAC`, `TASK_backend_157_BLOCKED_INFRASTRUCTURE`, `TASK_backend_157_BLOCKED_OWNERSHIP`, or `TASK_backend_157_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start backend_158, build dead routes, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
