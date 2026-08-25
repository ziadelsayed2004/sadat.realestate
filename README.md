# Sadat Real Estate Platform

Arabic-first MERN platform covering the public website, authentication and onboarding, Seeker workspace, Property Provider dashboard, and Admin dashboard.

## Supported runtime

- Node.js `24.x`
- npm `>=11 <12`
- TypeScript, Express, MongoDB/Mongoose, React 19, and Vite SSR
- Arabic (`ar`) is RTL; English (`en`) and Simplified Chinese (`zh-CN`) are LTR.

The supported deployment is native: Node.js processes managed by systemd behind Nginx, an authenticated loopback MongoDB replica set, native ClamAV, Certbot TLS, and Hostinger SMTP.

## Local preview on Windows, Ubuntu, or macOS

Local preview uses an externally supplied non-production `MONGODB_URI` (an installed MongoDB service or isolated Atlas deployment). The repository starts only its own local SMTP catcher, API, Web SSR, and unified-origin proxy; it never downloads or starts MongoDB and never uses Docker.

```bash
npm ci
npm run local:prepare
npm run local:check
npm run local:up
npm run local:smoke
```

Open:

- Platform: `http://localhost:8080`
- Captured OTP email: `http://localhost:8025`

The Local/UAT seed creates synthetic users and permission variants. The local-only administrator credential is documented in `docs/deployment/LOCAL_PREVIEW.md`; it exists only in the Local example and must never be reused on a VPS. Automatic administrator bootstrap is disabled for standalone MongoDB unless an operator explicitly supplies a replica set/Atlas configuration.

Synthetic showcase data is inserted automatically and can be re-applied idempotently with `npm run local:seed`. Stop everything with `npm run local:down`; inspect startup output with `npm run local:logs`.

If `.env.local` came from an earlier release, delete only that generated file and run `npm run local:prepare` again. Never commit a real environment file.

See [`docs/deployment/LOCAL_PREVIEW.md`](docs/deployment/LOCAL_PREVIEW.md).

## Hostinger Ubuntu VPS

Production uses:

- Nginx on ports 80/443.
- API on loopback port 3000.
- Web SSR on loopback port 4173.
- MongoDB on loopback port 27017 in authenticated `rs0` mode.
- ClamAV on loopback port 3310.
- systemd services and timers.
- Certbot certificates.
- Hostinger SMTP from `info@elsadatrealestate.com`.

Prepare secrets locally or on the target host:

```bash
npm run production:prepare
# Install it as root:elsadat mode 0640 and replace SMTP_PASSWORD.
sudo -u elsadat env PRODUCTION_ENV_FILE=/etc/elsadatrealestate/production.env node scripts/production-preflight.mjs
sudo -u elsadat env PRODUCTION_ENV_FILE=/etc/elsadatrealestate/production.env node scripts/native-production-check.mjs
```

Do not run synthetic seed data in Production. Follow [`docs/deployment/HOSTINGER_UBUNTU_RUNBOOK.md`](docs/deployment/HOSTINGER_UBUNTU_RUNBOOK.md) before switching DNS.

The native single-VPS private-storage boundary still requires explicit Project Owner and Security approval or an approved S3-compatible adapter. Source-level readiness is not a Production approval.

## Quality and Agent Pack

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run api:inventory
npm run openapi:validate
npm run postman:validate
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

The English-only execution graph is in `agent_pack/`. Design sources remain under `docs/design_sources/`; missing or mismatched source evidence must not be represented as verified.
