# API environment configuration

The API accepts four runtime configuration values at this stage:

- `APP_ENV`: `local`, `test`, `preview`, `uat`, or `production`.
- `API_HOST`: a hostname or IP address without a URL scheme or path.
- `API_PORT`: a decimal integer from `1` through `65535`.
- `MONGODB_URI`: a `mongodb://` or `mongodb+srv://` connection URI supplied as a secret outside source control.

The process manager or shell supplies these values. The application does not load `.env` files. `apps/api/.env.example` contains local non-secret documentation values only; it is not a source of production configuration.

Validation errors expose variable names and stable issue codes, never rejected values. Safe diagnostics include only the three allowlisted non-secret fields plus the fact that a database is configured; the URI itself is never included. Authentication, storage, notification, payment, and provider secrets are intentionally not declared until their owning tasks define those contracts.
