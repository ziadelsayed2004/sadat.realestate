# Native runtime migration report — 2026-08-25

## Delivery decision

The repository is now native-runtime-only. Local development and preview use Node.js supervision with an externally supplied non-production `MONGODB_URI`, a loopback SMTP catcher, API, Web SSR, and a single browser origin. The supervisor never downloads, starts, or manages MongoDB and never uses Docker. Production targets a native Ubuntu VPS with Nginx, systemd, authenticated loopback MongoDB `rs0`, ClamAV, Certbot, and Hostinger SMTP.

This archive is a Local/VPS deployment candidate, not proof that the external Hostinger environment is already Production-ready.

## Windows Local preview

Supported versions are Node.js 24.x and npm 11. From a fresh extracted directory:

```bat
npm ci
npm run local:prepare
npm run local:check
npm run local:up
npm run local:smoke
```

Open:

- Site: `http://localhost:8080`
- Captured OTP inbox: `http://localhost:8025`

`local:up` verifies the externally supplied non-production `MONGODB_URI`, builds all workspaces, applies the idempotent `local-showcase-v1` and `local-showcase-v2` seeds, and starts the application. The supervisor never downloads or starts MongoDB; standalone MongoDB runs with transactional admin bootstrap disabled.

Disposable Local identities:

- Super Admin: `admin.demo@example.invalid` / `LocalPreview-Admin-Only-2026!`
- Provider: `provider.demo@example.invalid`; request its email OTP and read it in the Local inbox.
- Seeker: register with a unique `.invalid` email, then read the email OTP in the Local inbox.

These identities are synthetic Local data. They are not included in the Production environment and must never be copied to a VPS.

Useful commands:

```bat
npm run local:status
npm run local:logs
npm run local:seed
npm run local:smoke
npm run local:down
```

If an old `.env.local` exists, delete only that generated file and rerun `npm run local:prepare`.

## Hostinger Ubuntu deployment

Follow `HOSTINGER_UBUNTU_RUNBOOK.md`. The checked-in native deployment set includes:

- Nginx HTTP and TLS sites for `elsadatrealestate.com` and `www.elsadatrealestate.com`.
- systemd API/Web services plus health-check and backup timers.
- MongoDB bootstrap and authenticated production `rs0` configuration.
- ClamAV loopback configuration.
- atomic release, rollback, backup, restore, health-check, and Certbot scripts.
- strict Production preflight and artifact validation.

Production SMTP is configured for `smtp.hostinger.com:465` with implicit TLS and `info@elsadatrealestate.com`. The mailbox password is intentionally absent. Generate `.env.production`, replace only its placeholders/approved values, install it as `/etc/elsadatrealestate/production.env`, and run the documented preflight. Never send the password through chat or commit it.

After DNS and TLS are active, run `SMOKE_BASE_URL=https://elsadatrealestate.com npm run production:smoke` from the deployed release.

## Verification completed in this migration workspace

- Native runtime component tests: SMTP capture, unified-origin proxy, artifact/script assertions.
- Workspace and syntax policy checks.
- Contracts, API, and Web strict TypeScript checks.
- Full repository lint.
- API tests: 513 passed.
- API coverage thresholds: 81.09% lines, 78.41% branches, 81.60% functions.
- Web tests: 378 passed, three design-source-integrity failures; 76 auxiliary tests passed.
- API, client, and SSR production builds.
- Client bundle budget.
- API inventory, OpenAPI, Postman, environment parsing, and JSON parsing.
- Native shell-script syntax.
- Production preflight and artifact validation using synthetic process-local values only.
- Repository scan found no remaining legacy orchestration or alternate-proxy runtime artifacts outside excluded third-party/generated directories.

## Open gates that must not be reported as passed

- Local stack startup, restart, seeded smoke, and shutdown were exercised against an installed standalone MongoDB service using a process-only URI override. The external replica-set transaction and backup/restore gates remain blocked.
- A fresh standalone online `npm audit --audit-level=high` must be run before release; the install-time audit reported zero vulnerabilities.
- Current Agent Pack audit has three truthful design-source errors: PUB-01 checksum mismatch and absent ADM-54 owner-authored HTML/PNG. These block the F7/full-platform claim but do not stop Local runtime inspection.
- Hostinger SMTP authentication/delivery, OTP delivery, DNS SPF/DKIM/DMARC, and public TLS require the real mailbox and live DNS.
- Nginx, systemd, MongoDB PRIMARY/transactions, ClamAV/EICAR, private-file permissions, monitoring, backup, isolated restore, and rollback require evidence from the actual Ubuntu VPS.
- Synthetic seed data must never run in Production.

Do not close `backend_139`, `frontend_096`, or `frontend_098`, and do not claim full Production parity, until their external evidence and design-source prerequisites are satisfied.
