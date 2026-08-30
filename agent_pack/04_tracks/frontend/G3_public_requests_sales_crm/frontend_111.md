# frontend_111 - Team Capacity and Reassignment UI

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G3_public_requests_sales_crm |
| Sequence | 228 |
| Dependencies | `backend_154`, `backend_155`, and `frontend_110` complete |
| Status | Open |

## Objective

Implement manager-scoped sales team, capacity, assignment, and reassignment controls with expected-version/reason safeguards and truthful queued states.

## Readiness and dependencies

- Verify team/capacity APIs, role scope, assignment history, inbox/detail behavior, and approved source evidence.
- Only authorized managers may reassign within scope; the API, not the UI, is authoritative.

## Allowed paths

Writes are limited to `apps/web/src/features/admin/**`, `apps/web/src/features/sales/**`, affected `apps/web/tests/**`, `packages/contracts/src/sales/**`, and exact Agent Pack evidence/state files.

## Forbidden paths and actions

- No `.env*`, `.local/**`, unauthorized PII, unrelated Admin screens, phone-auth, images, snapshots, Git index, database, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No client-only authorization, silent reassignment, fabricated capacity, multi-owner UI, masks, or nested agents.

## Ownership boundary

Frontend owns the bounded team/capacity/reassignment feature. Backend owns assignment authority and audit. Shared shell changes require separate ownership.

## Implementation requirements

1. Display active capacity, current load, eligibility, last assignment, assigned owner, and queued-unassigned state accurately.
2. Require expectedVersion and reason for reassignment; surface conflicts without optimistic false ownership.
3. Enforce Agent/Manager/Super Admin visibility and preserve audit/privacy action semantics.
4. Do not invent Admin Figma layouts; classify source blockers honestly.

## Migration and rollback

No database migration. Restore prior bounded UI behavior if review fails; preserve server assignment history and never reset unrelated work.

## Focused verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:vitest --workspace apps/web
npm.cmd run test:a11y --workspace apps/web
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run capacity/reassignment browser/API, RBAC/IDOR, optimistic-concurrency, accessibility, responsive, and no-update regression tests.

## Evidence requirements

Record capacity projections, queue/owner transitions, conflict behavior, reason/version payloads, role denials, audit events, source review, and regression evidence.

## Markers and stop

Success: `TASK_frontend_111_COMPLETE`

Blocked: `TASK_frontend_111_BLOCKED_RBAC`, `TASK_frontend_111_BLOCKED_CAPACITY`, `TASK_frontend_111_BLOCKED_FIGMA`, `TASK_frontend_111_BLOCKED_OWNERSHIP`, or `TASK_frontend_111_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start G4, change backend authority, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
