# frontend_110 - Admin/Sales Request Inbox and Customer Detail

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G3_public_requests_sales_crm |
| Sequence | 227 |
| Dependencies | `backend_155`, `backend_156`, and `frontend_109` complete |
| Status | Open |

## Objective

Build scoped Admin/Sales request list and detail surfaces showing persisted customer interests, assignment, status, notes, due dates, and safe PII projections.

## Readiness and dependencies

- Verify CRM APIs, RBAC matrix, persisted-first handoff, approved Admin source evidence, and ownership manifest.
- Exact phone filtering is allowed; name search is not. Admin states without canonical Figma approval remain source-blocked.

## Allowed paths

Writes are limited to `apps/web/src/features/admin/**`, `apps/web/src/features/sales/**`, affected `apps/web/tests/**`, `packages/contracts/src/admin/**`, `packages/contracts/src/sales/**`, and exact Agent Pack evidence/state files.

## Forbidden paths and actions

- No `.env*`, `.local/**`, unauthorized decrypted PII, phone-auth changes, unrelated Admin screens, images, snapshots, Git index, database, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No name search, client-only RBAC, invented Admin layouts, masks, crops, overlays, hidden regions, anti-alias masks, or nested agents.

## Ownership boundary

Frontend owns only the request inbox/detail feature and focused tests. Backend authorization remains authoritative. Shared Admin shell changes require a separate coordinator-owned task.

## Implementation requirements

1. Provide pagination, allowlisted filters/sort, assignment state, status, due/overdue indicators, notes, transitions, and safe detail projections.
2. Enforce Agent/Manager/Super Admin visibility via server responses and UI guards; do not rely on client-only hiding.
3. Make decrypt/export/privacy action flows permissioned, auditable, generic-error safe, and free of PII in URLs/logs.
4. Show saved request state before optional WhatsApp handoff and keep parity/regression evidence separate.

## Migration and rollback

No database migration. Roll back only the bounded UI/API adapter and restore prior route behavior; do not reset or discard unrelated files.

## Focused verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:vitest --workspace apps/web
npm.cmd run test:a11y --workspace apps/web
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run Agent/Manager/Super Admin browser/API scope, IDOR, pagination, exact-phone, accessibility, responsive, and approved-source checks.

## Evidence requirements

Record API/publicReference projection, role matrix, denial cases, filters/pagination, safe PII access, audit events, source review, and independent no-update regression results.

## Markers and stop

Success: `TASK_frontend_110_COMPLETE`

Blocked: `TASK_frontend_110_BLOCKED_RBAC`, `TASK_frontend_110_BLOCKED_FIGMA`, `TASK_frontend_110_BLOCKED_PII`, `TASK_frontend_110_BLOCKED_OWNERSHIP`, or `TASK_frontend_110_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_111, change APIs/data, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
