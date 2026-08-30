# frontend_109 - WhatsApp UX, Failure States and Accessibility

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G3_public_requests_sales_crm |
| Sequence | 226 |
| Dependencies | `frontend_108` and `backend_156` complete |
| Status | Open |

## Objective

Complete the persisted-first WhatsApp UX and accessible success, unavailable, validation, persistence, and retry states without exposing PII or implying an unsaved success.

## Readiness and dependencies

- Verify backend handoff statuses and frontend PUB-03 form evidence.
- The browser must not open WhatsApp after persistence failure; an unavailable handoff still displays the saved public reference safely.

## Allowed paths

Writes are limited to `apps/web/src/features/public/**`, `apps/web/src/features/frontend_foundation/**`, affected `apps/web/tests/**`, `packages/contracts/src/requests/**`, and exact Agent Pack evidence/state files.

## Forbidden paths and actions

- No `.env*`, `.local/**`, raw PII in UI URLs/logs, auth changes, Admin layouts, images, snapshot updates, Git index, database, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No masks, crops, overlays, hidden regions, anti-alias masks, fake persistence, or nested agents.

## Ownership boundary

Frontend owns the public handoff states and focused tests. Backend behavior is consumed through the approved contract, not reimplemented client-side.

## Implementation requirements

1. Render READY, UNAVAILABLE, validation, persistence, duplicate-click, retry, and provider-failure states in AR/EN.
2. Preserve publicReference and safe confirmation without rendering internal IDs or prefilled message content.
3. Meet keyboard, focus, screen-reader, direction, responsive, reduced-motion, and generic-error requirements.
4. Keep runtime regression snapshots separate from direct Figma parity evidence.

## Migration and rollback

No database migration. Restore the prior bounded UX adapter if review fails; never update snapshots to hide a defect and never discard unrelated changes.

## Focused verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:a11y --workspace apps/web
npm.cmd run test:vitest --workspace apps/web
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run AR/EN browser success/failure/handoff/accessibility/responsive/no-update regression checks.

## Evidence requirements

Record state transitions, persistence-before-navigation trace, no-PII rendering/log scan, focus behavior, screen-reader names, device/locale matrix, and direct source evidence separately.

## Markers and stop

Success: `TASK_frontend_109_COMPLETE`

Blocked: `TASK_frontend_109_BLOCKED_HANDOFF`, `TASK_frontend_109_BLOCKED_ACCESSIBILITY`, `TASK_frontend_109_BLOCKED_FIGMA`, `TASK_frontend_109_BLOCKED_OWNERSHIP`, or `TASK_frontend_109_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_110, change backend persistence, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
