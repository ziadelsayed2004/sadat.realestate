# Native runtime deployment

Production runs two restricted Node.js system services behind Nginx:

- API: `127.0.0.1:3000`
- Web SSR: `127.0.0.1:4173`
- MongoDB: `127.0.0.1:27017`, authenticated single-node `rs0`
- ClamAV: `127.0.0.1:3310`

Nginx owns the public ports and preserves `/api/v1` exactly once. Certbot manages public TLS. systemd owns process restart, shutdown, timers, and journal logs. `apps/api/src/modules/deployment/runtime.ts` retains the application shutdown boundary.

Local preview is implemented by `scripts/native-local.mjs`: it builds the repository, verifies the externally supplied non-production `MONGODB_URI`, starts the local SMTP catcher, API, Web SSR, and loopback reverse proxy, then inserts synthetic showcase data. It never downloads or starts MongoDB, uses Docker, or uses Production credentials. `local:status` performs live API, Web, proxy, and MongoDB-backed readiness checks.

Production artifacts are under `deploy/nginx`, `deploy/systemd`, `deploy/mongodb`, `deploy/clamav`, and `deploy/native`. Follow `docs/deployment/HOSTINGER_UBUNTU_RUNBOOK.md`. Native host startup, public TLS, real SMTP, scanner freshness, backup/restore, and rollback remain live gates rather than source-only claims.
