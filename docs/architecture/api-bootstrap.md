# API bootstrap foundation

`apps/api` now contains the minimal Express 5 and TypeScript runtime shell. `src/app.ts` composes the operational `/health` and `/ready` routes, while `src/server.ts` owns HTTP server creation, asynchronous start, idempotent stop, MongoDB lifecycle coordination, and SIGINT/SIGTERM shutdown handling.

The temporary development listener is `127.0.0.1:3000`. Environment validation belongs to `backend_003`; MongoDB and operational health/readiness are implemented by `backend_004`; shared contracts/errors, security middleware, observability, and the full test/CI harness remain later tasks. Product routes under `/api/v1` are still absent.
