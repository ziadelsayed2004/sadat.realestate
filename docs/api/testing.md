# Backend testing and CI foundation

The repository exposes one local quality gate used by CI:

```bash
npm run quality
```

It runs source lint, strict typechecks, workspace-policy tests, API coverage thresholds, builds, runtime API inventory, OpenAPI and Postman validation, the high-severity dependency audit, and the Agent Pack integrity audit. The GitHub Actions workflow runs the same command on Node 24 and then validates a synthetic non-production environment contract.

## Test suites

- `npm run test:unit` covers pure validators, mappers, policies, connection state logic, seed guards, and the test harness itself.
- `npm run test:integration` covers application/database readiness and executable API artifact boundaries without requiring an external database.
- `npm run test:api` starts ephemeral local HTTP servers for lifecycle, security, observability, and operational-route behavior.
- `npm test -- --runInBand` runs all three suites serially through the same manifest.
- `npm run test:coverage` runs all suites with Node's native coverage and fails below the committed branch, function, or line thresholds.

Every `apps/api/tests/**/*.test.ts` file must appear exactly once in the suite manifest. The harness tests enforce completeness and prevent accidental duplicate execution.

## Optional live MongoDB check

`npm run test:integration:live` is intentionally outside the normal and CI suites. It requires `APP_ENV=test` and an isolated `TEST_MONGODB_URI`, performs only connection, ping, and topology detection, and never prints the URI. Missing configuration exits as:

```text
Blocked — prerequisites unavailable: isolated TEST_MONGODB_URI is not configured.
```

This read-only smoke check does not prove transaction behavior. Transaction-dependent tasks still require an isolated replica set and their own tests.

## Test-data rules

Normal tests use injected boundaries, deterministic fakes, and synthetic values. They do not load a real `.env`, access production, or interpret a skipped external prerequisite as a pass. Product routes added later must be assigned to the appropriate suite and keep runtime inventory, OpenAPI, and Postman synchronized.
