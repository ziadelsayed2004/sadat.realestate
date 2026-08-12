# API environment configuration

The API accepts five runtime configuration values at this stage:

- `APP_ENV`: `local`, `test`, `preview`, `uat`, or `production`.
- `API_HOST`: a hostname or IP address without a URL scheme or path.
- `API_PORT`: a decimal integer from `1` through `65535`.
- `MONGODB_URI`: a `mongodb://` or `mongodb+srv://` connection URI supplied as a secret outside source control.
- `AUTH_ACCESS_TOKEN_SECRET`: a canonical base64url value representing at least 32 random bytes. It signs access tokens and derives a domain-separated OTP hashing key; the value is never exposed.

The process manager or shell supplies these values. The application does not load `.env` files. `apps/api/.env.example` contains local non-secret documentation values only; it is not a source of production configuration.

Validation errors expose variable names and stable issue codes, never rejected values. Safe diagnostics include only allowlisted non-secret fields, TTL/cookie policy, the derived OTP provider mode, and the fact that a database is configured; the MongoDB URI and authentication secret are never included.

OTP delivery mode is derived rather than configured by a secret: Local and Test select the deterministic fake adapter, while Preview, UAT, and Production remain `unconfigured` until an approved provider adapter is injected. Unconfigured environments fail OTP delivery closed and remain incomplete for release readiness. Storage, notification, payment, and external-provider credentials are intentionally not declared until their owning integrations define those contracts.
