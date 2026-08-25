# Superseded delivery status — 2026-08-24

This snapshot is retained for provenance. The current delivery report is `NATIVE_RUNTIME_MIGRATION_REPORT_2026-08-25.md`.

## Decision

The repository now targets a native Local preview and a native Hostinger Ubuntu runtime. Local startup requires Node.js 24/npm 11 and an externally supplied non-production `MONGODB_URI`; it never downloads MongoDB, starts a database process, or uses Docker. Production uses Nginx, systemd, MongoDB `rs0`, ClamAV, Certbot, and Hostinger SMTP.

This is still a deployment candidate, not an unconditional Production release. Design-source gaps, live target-host checks, real SMTP, storage approval, backup/restore, and external assurance remain release gates.

## Local workflow

```bash
npm ci
npm run local:prepare
npm run local:check
npm run local:up
npm run local:smoke
```

The site is `http://localhost:8080`; captured OTP email is `http://localhost:8025`. The native supervisor verifies the external MongoDB target, applies the idempotent local showcase seeds, and starts the application processes.

## Production workflow

Native artifacts include Nginx sites, hardened systemd services/timers, MongoDB bootstrap/production configuration, ClamAV settings, atomic release, TLS activation, backup, and guarded restore scripts. Follow `HOSTINGER_UBUNTU_RUNBOOK.md`.

## Verification boundary

Repository typecheck, lint, API/Web tests, build, dependency audit, API inventory, OpenAPI, Postman, environment parsing, and static deployment validation must be rerun after this migration. Live Ubuntu services, public TLS, Hostinger SMTP, ClamAV/EICAR, full route matrix, encrypted off-server copy, isolated restore, and rollback require target-host evidence and are not represented as passed by source-only checks.

Design source integrity and `frontend_096` remain independent blockers. Do not close `frontend_098` until every dependency is complete with current evidence.
