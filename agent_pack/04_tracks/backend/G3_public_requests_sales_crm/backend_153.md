# backend_153 - Transactional Persistence, PII Protection, UUID Reference, Idempotency and Dedupe

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G3_public_requests_sales_crm |
| Sequence | 221 |
| Dependencies | `backend_152` complete with approved contract |
| Status | Open |

## Objective

Persist validated PUB-03 requests atomically with encrypted PII, versioned key metadata, exact phone blind index, opaque UUID reference, idempotency, and safe deduplication.

## Readiness and dependencies

- Verify contract/mapping/privacy approvals, external Vault/KMS boundary, key custody, isolated replica-set, and backup/restore gates.
- Production secrets, Vault tokens, unseal shares, and customer data remain outside Git and Agent Pack.
- Stop if no safe reversible crypto or transaction boundary exists.

## Allowed paths

Writes are limited to `apps/api/src/modules/requests/**`, `apps/api/src/modules/security/**`, `apps/api/src/modules/crypto/**`, `apps/api/src/modules/database/**`, affected request/security/crypto tests, `packages/contracts/src/requests/**`, and exact Agent Pack evidence/state files.

## Forbidden paths and actions

- No `.env*`, Vault tokens/keys, production database, arbitrary logs, screenshots, images, unrelated identity/auth, phone OTP, Git index, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No name search, raw phone/name/message/ciphertext/HMAC input in logs, automatic lead TTL, fabricated consent, ObjectId public reference, or nested agents.

## Ownership boundary

Backend owns bounded request, crypto, database, and security paths. The external KMS/Vault is a configured boundary, not a source-controlled secret. Sales/UI writers are not authorized in this task.

## Implementation requirements

1. Execute validate, resolve, encrypt, blind-index, create internal record, UUID reference, idempotency, assignment placeholder, and audit event in a replica-set transaction.
2. Encrypt fullName, phone, and message; retain encryption key version and HMAC key version; exact phone lookup only.
3. Implement rotation with dual read/search, rewrap/re-index checkpoints, counts/hashes, old-read retirement proof, backup treatment, and suppression after restore.
4. Support privileged manual anonymization/deletion with identity verification, legal-hold check, reason, approval, actor audit, and minimal tombstone.

## Database migration and rollback

Use backward-compatible collections/indexes and isolated dry-run/apply only. Rollback disables the new submission boundary, retains the previous key read path, restores approved indexes/schema, and never reintroduces deleted PII without legal-owner direction.

## Focused verification

```powershell
npm.cmd run privacy:crypto-check
npm.cmd run privacy:rotation -- --dry-run
npm.cmd run requests:migrate -- --dry-run
npm.cmd run typecheck
npm.cmd run test:api
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run transaction, retry, concurrent idempotency, blind-index exact-match, rotation, restore, deletion, anonymization, redaction, and ObjectId non-disclosure tests.

## Evidence requirements

Record key boundary/version/rotation evidence without secrets, transaction traces, before/after counts, index definitions, dedupe behavior, UUID examples that contain no PII, backup suppression, deletion ledger, restore drill, and rollback command.

## Markers and stop

Success: `TASK_backend_153_COMPLETE`

Blocked: `TASK_backend_153_BLOCKED_VAULT`, `TASK_backend_153_BLOCKED_TRANSACTION`, `TASK_backend_153_BLOCKED_BACKUP`, `TASK_backend_153_BLOCKED_OWNERSHIP`, or `TASK_backend_153_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start backend_154, send WhatsApp, use production data, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
