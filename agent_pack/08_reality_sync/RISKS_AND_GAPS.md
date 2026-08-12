# Risks and Gaps

## Verified repository gaps

- Git root, branch, history, and the initial clean-worktree baseline are available; later worktree changes must remain limited to the selected task and generated synchronization.
- The workspace skeleton, package manifests, lockfile, strict shared config, structural checks, foundation tests, and minimal Express/TypeScript API bootstrap now exist.
- Strict validation for `APP_ENV`, `API_HOST`, `API_PORT`, redacted `MONGODB_URI`, and the access-token signing secret plus a safe Local-only example now exist. Shared contracts/errors, security middleware, redacted request-context logging, Admin and phone-OTP authentication/session handling, source lint, categorized tests, coverage thresholds, the basic CI quality workflow, and executable inventory/OpenAPI/Postman drift checks are implemented; centralized log transport, production deployment, web runtime, and live provider secrets remain future work.
- The database boundary, operational routes, identity/account schemas, Admin Argon2id credentials, signed access tokens, opaque refresh lifecycle, and hashed/TTL/bounded OTP challenges are implemented. Local/Test use a deterministic fake OTP adapter; Preview/UAT/Production fail closed until an approved adapter is injected. No external MongoDB replica set, live OTP vendor, storage adapter, notification provider, map provider, payment provider, isolated live data, or synthetic provisioned account exists. Server-enforced unique/TTL OTP/session behavior and end-to-end live login/rotation still require an isolated MongoDB check and explicitly provisioned synthetic account.
- External database/provider and production-readiness gates remain blocked until approved topology and adapters are supplied. No real `.env` or secret has been loaded; production index synchronization remains deployment-managed.
- Node `v22.18.0` is available while the repository declares Node `>=24 <25` and the CI workflow targets Node 24; the workflow itself cannot be executed by this local Node 22 environment and still requires its first hosted run.

## Product decisions still open

See `01_product/OPEN_QUESTIONS.md` and `DECISION_LOG.md`. No temporary default in that register is a production decision. Recompute this file after each relevant task and release gate.
