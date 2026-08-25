# Backend readiness gate

`apps/api/src/modules/release/readiness.ts` represents typecheck, lint, tests, coverage, build, dependency audit, API inventory, OpenAPI, Postman, environment, integration, API, and Agent Pack checks individually.

External readiness remains conditional until an isolated native Ubuntu host proves:

- Authenticated MongoDB `rs0` transactions and concurrency.
- Nginx and Certbot public behavior.
- systemd restart and graceful shutdown.
- Hostinger SMTP authentication and real OTP delivery.
- Native ClamAV signature freshness and infected-file rejection.
- Private-storage authorization.
- Encrypted off-server backup and isolated restore.
- Monitoring, resource capacity, rollback, and external security assurance.

Unavailable prerequisites are recorded as blocked, never passed.

