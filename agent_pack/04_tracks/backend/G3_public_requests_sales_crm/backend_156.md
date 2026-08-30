# backend_156 - Persist-First WhatsApp Handoff and Audit/Outbox Events

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G3_public_requests_sales_crm |
| Sequence | 225 |
| Dependencies | `backend_155` complete |
| Status | Open |

## Objective

Generate a safe WhatsApp handoff only after committed request persistence, assignment, and audit/outbox events, retaining the request when WhatsApp configuration is unavailable.

## Readiness and dependencies

- Verify request transaction, assignment, scoped CRM API, approved handoff channel, and redaction policy.
- WhatsApp is optional after persistence; it must never be the persistence mechanism or a reason to lose customer data.

## Allowed paths

Writes are limited to `apps/api/src/modules/requests/**`, `apps/api/src/modules/integrations/**`, `apps/api/src/modules/audit/**`, affected request/integration tests, `apps/api/openapi/**`, `packages/contracts/src/requests/**`, and exact Agent Pack evidence/state files.

## Forbidden paths and actions

- No `.env*`, real WhatsApp credentials, prefilled PII logs, production data, unrelated integrations, images, snapshots, Git index, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No handoff before transaction commit, no raw ObjectId/public PII, no silent failure, and no nested agents.

## Ownership boundary

Backend owns handoff integration, audit/outbox ordering, and focused tests. Public UX belongs to frontend_109. Secrets remain external.

## Implementation requirements

1. Commit request, assignment state, idempotency result, and audit/outbox event before constructing a READY URL.
2. Return `UNAVAILABLE` after successful persistence if configuration or provider setup fails.
3. Redact names, phones, messages, ciphertext, HMAC inputs, tokens, and prefilled content from logs/metrics.
4. Keep retry behavior idempotent and expose only publicReference and approved response fields.

## Migration and rollback

No destructive migration. Feature-flag or disable handoff while preserving request persistence; restore the previous integration adapter and keep saved records/audit intact.

## Focused verification

```powershell
npm.cmd run test:api
npm.cmd run test:integration
npm.cmd run api:audit
npm.cmd run openapi:validate
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run transaction ordering, ready/unavailable/provider failure, retry/idempotency, redaction, and no-data-loss tests.

## Evidence requirements

Record before/after commit ordering, assignment/audit event IDs without PII, handoff status matrix, generic errors, redaction scans, and rollback/feature-flag behavior.

## Markers and stop

Success: `TASK_backend_156_COMPLETE`

Blocked: `TASK_backend_156_BLOCKED_TRANSACTION`, `TASK_backend_156_BLOCKED_EXTERNAL`, `TASK_backend_156_BLOCKED_REDACTION`, `TASK_backend_156_BLOCKED_OWNERSHIP`, or `TASK_backend_156_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_109, send a live customer message, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
