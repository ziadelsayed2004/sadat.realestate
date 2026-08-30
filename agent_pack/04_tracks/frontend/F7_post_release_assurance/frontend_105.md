# frontend_105 - Pre-Commit Full Platform Audit and Release Candidate Coordinator

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Kind | coordination |
| Sequence | 214 / 214 |
| Depends on | `frontend_104` |
| Scope | Full platform audit, release-candidate evidence, cleanup classification, and atomic commit planning |

## Purpose

Complete the pre-commit full platform audit for the current Sadat Real Estate repository. Reconcile all 131 canonical screens, the truthful API blueprint, approved-locale browser evidence, local runtime checks, and release gates. The task owns final evidence and Agent Pack synchronization, but it must not imply parity or production readiness where source, infrastructure, or external-provider evidence is unavailable.

## Required handling

- Inspect current checkpoints, reports, route inventories, source manifests, and worktree state before changing task state.
- Use canonical Figma `Odl1Epn2u6lIEuIMmABT7o` only. `0HBdTNGROmmpC6S7OYa3iJ` is forbidden.
- Execute Arabic RTL and English LTR only. Do not execute, edit, or update `zh-CN`.
- Preserve the exact 29 screen-level external/source exceptions, all historical reports, generated browser evidence, runtime data, secrets, and unrelated user changes.
- Run focused gates before one final approved AR/EN 131-screen Playwright matrix without `--ignore-snapshots` or `--update-snapshots`. Resolve or classify the seven flaky and 65 previously unaccounted cases with evidence.
- Reconcile runtime routes, endpoint blueprint status, OpenAPI, Postman, authorization policy, database topology, local traffic, rate-limit behavior, CSS headroom, bundle budgets, security, accessibility, performance, SEO, and environment gates.
- Prepare a cleanup manifest and selective atomic commit plan. Do not commit, push, deploy, reset, revert, stash, clean, delete user changes, or perform destructive cleanup.

## Acceptance

- Publish an English-only Agent Pack audit report and cleanup manifest plus the required Arabic report under `docs/quality/figma_parity`.
- Record the 131-screen totals, exact remaining exceptions and owners, API reconciliation, browser matrix counts, gate exit codes, runtime/deployment prerequisites, worktree divergence, and no-commit result.
- Synchronize task catalog, task state, dependencies, atomic task map, step-file plan, task board, finish index, count summary, selector, and execution manifest with zero Agent Pack audit errors.
- Finish with the honest marker `FULL_131_READY_WITH_EXTERNAL_EXCEPTIONS` unless new evidence requires `FULL_131_RECONCILED_RELEASE_READY` or `FINAL_INTEGRATION_BLOCKED`.

## Verification

- Focused frontend, API, contract, authorization, security, accessibility, performance, SEO, and route checks.
- Approved AR/EN six-project Playwright matrix in normal no-update mode and controlled reruns for any flaky or residual failures.
- Root typecheck, lint, workspace tests, API unit/integration/coverage, build, bundle, dependency audit, environment, local status/smoke, and isolated replica-set readiness.
- `npm run api:audit`, API inventory, OpenAPI validation, Postman validation, `node agent_pack/scripts/sync_pack.mjs`, `node agent_pack/scripts/audit_pack.mjs`, and `git diff --check`.
