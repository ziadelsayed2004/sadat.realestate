# backend_154 - Sales Teams, Capacity Routing and Assignment History

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G3_public_requests_sales_crm |
| Sequence | 222 |
| Dependencies | `backend_153` complete |
| Status | Open |

## Objective

Implement deterministic capacity-aware single-owner routing with queued-unassigned fallback, optimistic concurrency, and auditable assignment history.

## Readiness and dependencies

- Verify persisted request schema, PII boundary, isolated transaction support, role permissions, and assignment-rule approval.
- No assignment is accepted from the public client; all relations, team, agent, capacity, status, and audit data are server-derived.

## Allowed paths

Writes are limited to `apps/api/src/modules/sales/**`, `apps/api/src/modules/requests/**`, `apps/api/src/modules/database/**`, affected sales/request tests, `packages/contracts/src/sales/**`, and exact Agent Pack evidence/state files.

## Forbidden paths and actions

- No `.env*`, production database, PII logging, phone-auth, public form UI, images, snapshots, unrelated roles, Git index, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No multi-owner array, arbitrary assignment, silent reassignment, unapproved capacity override, or nested agents.

## Ownership boundary

Backend owns sales routing, request assignment persistence, and related contracts/tests. Manager UI and Admin UI remain untouched until their tasks.

## Implementation requirements

1. Define active teams, managers, members, capacity, permission, current load, lastAssignedAt, and routing-rule version.
2. Select eligible agents by least open load, oldest last assignment, then stable internal ID.
3. Save one `assignedTo` or `QUEUED_UNASSIGNED`; use transaction plus expected version to prevent double assignment.
4. Record before/after owner/team, rule version, actor, reason, and timestamp for every assignment/reassignment.

## Database migration and rollback

Create backward-compatible collections/indexes only after isolated dry-run and backup proof. Rollback disables new routing, preserves existing request ownership, and restores only approved schema/index additions.

## Focused verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:api
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run capacity, queue, deterministic ordering, concurrency/version conflict, permission, and audit-history tests.

## Evidence requirements

Publish schema/index plan, eligibility matrix, deterministic assignment traces, queued fallback, race test results, reassignment history, and rollback/backup evidence without PII.

## Markers and stop

Success: `TASK_backend_154_COMPLETE`

Blocked: `TASK_backend_154_BLOCKED_CAPACITY`, `TASK_backend_154_BLOCKED_RBAC`, `TASK_backend_154_BLOCKED_TRANSACTION`, `TASK_backend_154_BLOCKED_OWNERSHIP`, or `TASK_backend_154_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start backend_155, change UI, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
