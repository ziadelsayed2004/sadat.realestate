# backend_155 - Admin/Sales Request APIs and Assigned-Scope RBAC

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G3_public_requests_sales_crm |
| Sequence | 223 |
| Dependencies | `backend_154` complete |
| Status | Open |

## Objective

Expose scoped Admin/Sales request, notes, transitions, privacy-action, team, and capacity APIs using opaque public references, server-derived fields, strict pagination, and assigned-scope RBAC.

## Readiness and dependencies

- Verify assignment collections, role matrix, PII crypto boundary, API contract, audit model, and route inventory.
- Sales Agent sees assigned requests; Sales Manager sees authorized team scope; Super Admin sees all; unrelated Admin cannot decrypt PII.
- Require expectedVersion/reason for reassignment and audit all decrypt/export/privacy operations.

## Allowed paths

Writes are limited to `apps/api/src/modules/admin/**`, `apps/api/src/modules/sales/**`, `apps/api/src/modules/requests/**`, `apps/api/src/modules/audit/**`, affected admin/sales/request tests, `apps/api/openapi/**`, `apps/api/postman/**`, `packages/contracts/src/admin/**`, `packages/contracts/src/sales/**`, and exact Agent Pack evidence/state files.

## Forbidden paths and actions

- No `.env*`, production data, name search, arbitrary sort/filter, client-controlled assignment/status/source/audit/relations, images, snapshots, Git index, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No client-only authorization, PII in logs, ObjectId in responses, or nested agents.

## Ownership boundary

Backend owns listed CRM API/contracts/tests and audit projections. UI work belongs to later frontend tasks. Shared RBAC changes must be bounded and recorded.

## Implementation requirements

1. Implement approved list/detail/assign/notes/transitions/privacy-actions/team/capacity routes with publicReference lookup.
2. Support exact phone filter only; allowlist filters, sort, pagination, date/overdue/property/project/team/assignee fields.
3. Enforce ownership/team/role scope server-side, generic errors, body limits, no-store/CSRF/origin policy where applicable, and redacted audit.
4. Synchronize runtime route inventory, contracts, OpenAPI, Postman, and security matrix.

## Database migration and rollback

Only backward-compatible indexes/projections after dry-run and explain evidence. Rollback restores the prior API projection/route behavior and preserves request records and audit events.

## Focused verification

```powershell
npm.cmd run test:api
npm.cmd run api:audit
npm.cmd run openapi:validate
npm.cmd run postman:validate
npm.cmd run test:security
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run role matrix, IDOR, exact-phone, pagination, filter/sort allowlist, decrypt/export/privacy-action, and audit-redaction tests.

## Evidence requirements

Record route contracts, role/ownership matrix, denial cases, explain plans, pagination limits, audit events, publicReference-only responses, and artifact synchronization hashes.

## Markers and stop

Success: `TASK_backend_155_COMPLETE`

Blocked: `TASK_backend_155_BLOCKED_RBAC`, `TASK_backend_155_BLOCKED_CONTRACT`, `TASK_backend_155_BLOCKED_OWNERSHIP`, or `TASK_backend_155_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_108, expose PII, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
