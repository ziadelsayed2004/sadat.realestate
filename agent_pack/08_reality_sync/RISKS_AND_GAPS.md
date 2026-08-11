# Risks and Gaps

## Verified repository gaps

- The current root is not a Git checkout, so change history and a clean-worktree baseline cannot be established.
- No application runtime, package manifest, lockfile, workspace, tests, API implementation, OpenAPI runtime, Postman collection, CI, deployment configuration, or environment examples are present.
- No MongoDB replica set, storage adapter, notification provider, map provider, payment provider, or isolated test data is available.
- Runtime gates that require npm scripts or dependencies are blocked until the application repository is supplied.
- Node `v22.18.0` is available while the architecture baseline plans Node 24 LTS; compatibility must be confirmed before foundation work.

## Product decisions still open

See `01_product/OPEN_QUESTIONS.md` and `DECISION_LOG.md`. No temporary default in that register is a production decision. Recompute this file after each relevant task and release gate.
