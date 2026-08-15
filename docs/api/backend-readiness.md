# Backend readiness gate

`apps/api/src/modules/release/readiness.ts` records the final backend gate as structured data. Local commands are represented individually (`typecheck`, lint, serial tests, coverage, build, dependency audit, inventory, OpenAPI, Postman, environment, integration, API, and Agent Pack audit). A failed local check produces `blocked`; a clean local matrix with unavailable external prerequisites produces `conditional`.

The checked-in external prerequisite list is intentionally blocked until an owner supplies an isolated MongoDB replica set, approved private storage/scanning adapters, a Docker engine run, and external security assurance. These are not silently reported as passed, and no production readiness, security certification, or frontend-started claim is made. `frontendStarted` is a contract literal set to `false` for this backend phase.

