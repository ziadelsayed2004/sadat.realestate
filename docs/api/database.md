# MongoDB, health, readiness, and development seed

The API uses a dedicated Mongoose connection configured from the process-provided `MONGODB_URI`. The URI is validated for MongoDB schemes without being printed or included in diagnostics.

`GET /health` reports process liveness only. `GET /ready` reports `200` only when every installed required dependency is ready. It always checks MongoDB and, when the authentication runtime is installed, also checks the OTP provider adapter. An unavailable database or required OTP adapter returns `503` with redacted per-dependency status. These operational routes are intentionally unversioned and expose no connection or provider details.

Index creation is automatic only in `local` and `test`. `preview`, `uat`, and `production` use deployment-managed indexes; production never performs destructive synchronization at process startup.

The seed runner permits only `local` and `uat`. It refuses every other environment, including Production, before creating a connection or writing. Its registry is currently empty because no approved domain models or product fixtures exist. Future approved fixtures must be synthetic and idempotent; stable step IDs and the seed ledger prevent an applied step from being rerun.

The checked-in `.env.example` is documentation only. The application does not load `.env` files. External MongoDB topology and hosting remain pending under Q-010; isolated replica-set integration testing is required when a test URI is available.
