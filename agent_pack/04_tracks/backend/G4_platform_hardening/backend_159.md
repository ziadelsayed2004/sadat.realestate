# backend_159 - Hostinger SMTP, Storage, Malware Scanning, Monitoring, Backup/Restore and Production Readiness

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G4_platform_hardening |
| Sequence | 231 |
| Dependencies | `backend_158` complete |
| Status | Open |

## Objective

Prove local, staging, and production configuration readiness for Hostinger SMTP, private storage, malware scanning, monitoring, Vault/artifact recovery, and backup/restore without secrets in Git or live customer sends.

## Readiness and dependencies

- Verify API hardening, isolated Mongo/backup gates, secret injection boundary, and explicit approval for any staging or production send.
- Preserve Admin email/password and Seeker/Provider email-only OTP; no phone fallback.

## Allowed paths

Writes are limited to affected `apps/api/src/modules/email/**`, `apps/api/src/modules/uploads/**`, `apps/api/src/modules/observability/**`, affected tests, bounded `deploy/**`, `scripts/**`, `docs/deployment/**`, and exact Agent Pack evidence/state files. Secrets remain external.

## Forbidden paths and actions

- No `.env*` secret reads/writes, credentials, real OTP/PII sends without approval, production data, images, snapshots, Git index, commit, push, deploy, reset, revert, stash, clean, or history rewrite.
- No phone-auth fallback, secret logging, unsafe storage, skipped DNS checks, or nested agents.

## Ownership boundary

Backend owns readiness adapters, checks, tests, and evidence. Hostinger/Vault/storage/DNS are external configuration boundaries and are never committed.

## Implementation requirements

1. Provide deterministic local catcher; controlled staging smoke; production config validation with `smtp.hostinger.com`, port 465 TLS and documented 587 STARTTLS fallback.
2. Load full mailbox credentials only from external VPS secret environment; use generic errors and redact OTP/PII.
3. Verify MX/SPF/DKIM/DMARC, delivery/rejection/throttle/latency monitoring, private storage, malware scanning, Vault/artifact recovery, backups, restore suppression, and rollback.
4. Fail closed when Production configuration is incomplete and keep identity boundaries unchanged.

## Migration and rollback

No irreversible data migration. Rollback restores previous SMTP/storage release/config and disables OTP fail-closed; no phone fallback or secret recovery through Git.

## Focused verification

```powershell
npm.cmd run smtp:check
npm.cmd run production:config
npm.cmd run production:preflight
npm.cmd run local:smoke
npm.cmd run test:security
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Run only approved controlled staging smoke; live Production sends and DNS changes require explicit external approval and must be recorded as gated.

## Evidence requirements

Record config key names without values, local/staging/production results, DNS report, delivery metrics without PII, storage/scanner/Vault/artifact recovery, backup/restore drill, residual risk, and rollback.

## Markers and stop

Success: `TASK_backend_159_COMPLETE`

Blocked: `TASK_backend_159_BLOCKED_SMTP`, `TASK_backend_159_BLOCKED_DNS`, `TASK_backend_159_BLOCKED_INFRASTRUCTURE`, `TASK_backend_159_BLOCKED_SECRETS`, or `TASK_backend_159_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start frontend_113, send unapproved mail, expose secrets, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
