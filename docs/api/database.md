# MongoDB, health, readiness, and development seed

The API uses a dedicated Mongoose connection configured from the process-provided `MONGODB_URI`. The URI is validated for MongoDB schemes without being printed or included in diagnostics.

`GET /health` reports process liveness only. `GET /ready` reports `200` only when every installed required dependency is ready. It always checks MongoDB and, when the authentication runtime is installed, also checks the OTP provider adapter. An unavailable database or required OTP adapter returns `503` with redacted per-dependency status. These operational routes are intentionally unversioned and expose no connection or provider details.

Index creation is automatic only in `local` and `test`. `preview`, `uat`, and `production` use deployment-managed indexes; production never performs destructive synchronization at process startup.

The seed runner permits only `local` and `uat`. It refuses every other environment, including Production, before creating a connection or writing. Its registry is currently empty because no approved domain models or product fixtures exist. Future approved fixtures must be synthetic and idempotent; stable step IDs and the seed ledger prevent an applied step from being rerun.

The checked-in `.env.example` is documentation only. The application does not load `.env` files. External MongoDB topology and hosting remain pending under Q-010; isolated replica-set integration testing is required when a test URI is available.

## Migration runner

`apps/api/src/modules/database/migrations.ts` provides an ordered, checksum-pinned migration runner and a MongoDB-backed `database_migrations` ledger. Definitions are sorted by version, duplicate IDs/versions are rejected, unknown ledger entries and checksum changes fail closed, and a migration is recorded only after its `up` handler succeeds. The default mode is `plan`; applying requires an explicit confirmation flag. The runner never silently rewrites an applied migration and does not claim transactional or live success without the deployment's MongoDB topology.

## Backup and restore drill

`backup-restore.ts` defines an adapter boundary for backup creation, restore into an opaque isolated target, and verification. Planning is always safe and non-destructive. Execution requires explicit confirmation and an injected provider; without one it returns `blocked` with `BACKUP_PROVIDER_UNAVAILABLE`. A restore is reported `verified` only after the provider confirms it, while provider failures and failed verification remain explicit failures. No credentials, connection strings, production data, or vendor-specific commands are checked in.

## Index rollout

`index-rollout.ts` derives the property rollout plan from the existing schema and canonical property index catalog. It validates unique collection/name identities, compares existing keys before creation, creates missing indexes only, and never drops or synchronizes destructively. Local/Test use the existing automatic-development policy; Preview/UAT/Production remain deployment-managed and require explicit confirmation. Existing indexes with a different key fail closed. Live index creation and `explain` verification remain deployment prerequisites when an isolated replica set is unavailable.
