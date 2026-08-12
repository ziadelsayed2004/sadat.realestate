# Current Reality Snapshot

- Snapshot date: 2026-08-12.
- Repository root is a Git worktree on `main` and contains `.git/`, `agent_pack/`, and `docs/`.
- The initial pre-mutation Git worktree check was clean; subsequent changes in this run are the documented truth repair and generated task-state synchronization.
- The npm workspace foundation is present: root `package.json`, `package-lock.json`, `tsconfig.base.json`, `.gitignore`, and manifests for `apps/api`, `apps/web`, `packages/contracts`, `packages/ui`, and `packages/config`.
- Structural policy scripts and tests are present under `packages/config/`; the repository now has ESLint source checks, disjoint unit/integration/API test harnesses, enforced native coverage thresholds, a local `quality` gate, and a basic Node 24 GitHub Actions workflow.
- The API exposes only operational `/health` and `/ready` routes. A Mongoose connection boundary, MongoDB readiness ping, environment-specific index policy, and local-only seed harness now exist. Strict validation covers `APP_ENV`, `API_HOST`, `API_PORT`, and redacted `MONGODB_URI`; the checked-in example is documentation only. Shared DTO envelopes, the HTTP security baseline, validated request/trace context, and redacted structured request-completion logs are implemented. OpenAPI 3.1 and Postman now have executable drift validation, a safe synthetic local environment, and an explicit `/api/v1` product-route scaffold without documenting planned endpoints. React/web runtime, product routes, authentication, production deployment configuration, providers, and external isolated live-test data remain absent.
- Node.js `v22.18.0` and npm `11.6.4` are available; the repository declares Node `>=24 <25` and the planned environment baseline is Node 24 LTS.
- The Agent Pack contains an English screen registry and metadata for all 131 Screen IDs. The original Arabic handoff remains an external source identified by checksum in `09_sources/HANDOFF_REFERENCE.md`.
- Agent Pack audit is clean. Mutable task status and the selected task are authoritative only in `03_execution/TASK_STATE.json` and `step_info.json`; this snapshot does not duplicate them.
- Repository inventory: `docs/repository-inventory.md`.
- Visual pixel audit remains deferred until Figma/Drive frames are opened during frontend tasks.

Any code added later must rebuild this report from the actual repository rather than copying this snapshot.
