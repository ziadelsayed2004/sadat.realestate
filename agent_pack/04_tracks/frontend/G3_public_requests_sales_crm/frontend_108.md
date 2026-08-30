# frontend_108 - Canonical PUB-03 Shared Inquiry/Viewing Form

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G3_public_requests_sales_crm |
| Sequence | 224 |
| Dependencies | `backend_152` and `backend_153` complete |
| Status | Open |

## Objective

Implement the approved guest-only PUB-03 inquiry/viewing form with AR/EN copy, exact contact-time mapping, validation, approved privacy disclosure, and persisted-first submission semantics.

## Readiness and dependencies

- Verify the backend contract, UUID/persistence behavior, approved AR/EN copy, canonical Figma node, and privacy-disclosure approval.
- Stop if the contact-time mapping or disclosure is not approved; do not guess or fabricate consent.
- This form has no account, login, email field, OTP, or phone authentication.

## Allowed paths

Writes are limited to `apps/web/src/features/public/**`, affected `apps/web/tests/**`, `packages/contracts/src/requests/**`, and exact Agent Pack evidence/state files. Shared UI changes require a separately owned task.

## Forbidden paths and actions

- No `.env*`, `.local/**`, unrelated auth/identity, Admin layout invention, images, snapshots, Git index, database, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No hidden regions, masks, crops, overlays, anti-alias masks, arbitrary client metadata, fake success, or nested agents.

## Ownership boundary

Frontend owns the public form feature and focused tests. Backend contract changes are not implied. Existing public surfaces outside the exact form remain protected.

## Implementation requirements

1. Render INQUIRY and VIEWING using approved fields and AR RTL/EN LTR mapping.
2. Send only allowlisted fields; let the server resolve property relations, locale, source, assignment, status, audit, and timestamps.
3. Show approved non-disruptive privacy disclosure and never send consentAt or client-selected privacy version.
4. Disable duplicate submission, show generic errors, and retain persisted reference before any optional WhatsApp navigation.

## Migration and rollback

No database migration. Rollback restores the exact prior form behavior and contract adapter with a bounded patch; do not reset or discard unrelated work.

## Focused verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:vitest --workspace apps/web
npm.cmd run test:a11y --workspace apps/web
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run AR/EN functional, validation, keyboard, screen-reader, responsive, duplicate-click, persistence-before-handoff, and no-update regression checks.

## Evidence requirements

Record canonical node/copy provenance, contact-time mapping, disclosure version/visibility, request payload redaction, publicReference response, persistence trace, and separate regression/parity evidence.

## Markers and stop

Success: `TASK_frontend_108_COMPLETE`

Blocked: `TASK_frontend_108_BLOCKED_CONTACT_TIME_SOURCE`, `TASK_frontend_108_BLOCKED_PRIVACY_APPROVAL`, `TASK_frontend_108_BLOCKED_FIGMA`, `TASK_frontend_108_BLOCKED_OWNERSHIP`, or `TASK_frontend_108_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start backend_156, open WhatsApp, change auth, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
