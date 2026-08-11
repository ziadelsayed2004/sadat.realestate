# API security baseline

The API application installs one explicit security boundary before its operational routes:

- Helmet sets standard response security headers.
- CORS uses an exact allowlist supplied through `SecurityOptions`; wildcard origins are rejected and credentials are never enabled for an implicit wildcard.
- JSON and URL-encoded bodies have bounded parser limits (`1mb` and `100kb` by default). Oversized or malformed bodies return the shared redacted error envelope.
- Rate limiting uses the socket-derived client key by default. `/health` and `/ready` are exempt so liveness/readiness probes remain useful. The current in-process limiter is a safe single-instance boundary; a distributed production deployment must replace it with a shared store before relying on limits across replicas.
- Request bodies, query values, and route parameters reject MongoDB operators, dotted keys, and prototype-pollution keys before route handling. Unsafe key names are not echoed in the response.
- `trust proxy` defaults to `false`. Deployments that sit behind a trusted proxy must pass an explicit value; forwarded headers are never trusted implicitly.
- Security/parser failures use the shared error contract and never expose stacks, credentials, connection strings, or raw parser messages.

No product route or authentication behavior is added by this foundation task. The existing `/health` and `/ready` routes remain the only active operational routes.
