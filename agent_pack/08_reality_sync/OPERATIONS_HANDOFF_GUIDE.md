# Operations and Handoff Guide

This guide is the repository-grounded handoff for local development, test, Preview readiness, and release operations. It describes executable boundaries; it does not claim that external Preview or Production infrastructure is provisioned.

## Authority and scope

Use these current files as source of truth when this guide and a generated artifact disagree:

- Web route resolution: apps/web/src/routes/route-table.ts.
- Implemented API routes: apps/api/src/modules/database/api-inventory.ts and its generated runtime output.
- API contracts: packages/contracts/src/.
- OpenAPI: apps/api/openapi/openapi.json.
- Postman: apps/api/postman/.
- Roles and permissions: agent_pack/01_product/ROLES_PERMISSIONS_MATRIX.md.
- Environment policy: docs/api/environment.md and agent_pack/02_architecture/ENVIRONMENT_MATRIX.md.
- Deployment artifacts: `deploy/nginx/elsadatrealestate-http.conf`, `deploy/nginx/elsadatrealestate.conf`, `deploy/systemd/elsadat-api.service`, `deploy/systemd/elsadat-web.service`, `deploy/native/deploy-release.sh`, `deploy/mongodb`, `deploy/clamav`, and `docs/api/deployment.md`.
- Release readiness policy: packages/contracts/src/release/index.ts and apps/api/src/modules/release/readiness.ts.

The Agent Pack remains English-only. Product UI content remains Arabic-first: Arabic is RTL; English and Simplified Chinese are LTR.

## Prerequisites

- Node.js 22.18 through 24.x and npm 11 are supported by the root manifest. Production should pin one tested Node major for the lifetime of a release rather than switching it in place.
- A MongoDB replica set is required for transactional API paths. The native Local supervisor provisions an isolated replica-set process; Preview/UAT require an isolated non-Production replica set.
- Native Local execution requires Node.js 22.18+ or Node.js 24. The first start downloads a disposable MongoDB development binary and retains it only under the ignored `.local` directory.
- Never read a real .env, use Production data, or copy credentials into a command, fixture, log, Postman file, or evidence record.

## Local setup

The API reads configuration from the process environment and does not load .env files. Use a local-only base64url secret supplied out of band.

    $env:APP_ENV = 'local'
    $env:API_HOST = '127.0.0.1'
    $env:API_PORT = '3000'
    $env:MONGODB_URI = 'mongodb://127.0.0.1:27017/sadat?replicaSet=rs0'
    $env:AUTH_ACCESS_TOKEN_SECRET = '<local-only base64url secret supplied out of band>'
    npm.cmd run dev --workspace apps/api

In a second terminal, build and start the Web SSR process:

    $env:WEB_HOST = '127.0.0.1'
    $env:WEB_PORT = '4173'
    $env:WEB_API_ORIGIN = 'http://127.0.0.1:3000'
    $env:WEB_PUBLIC_ORIGIN = 'http://127.0.0.1:4173'
    npm.cmd run dev --workspace apps/web

For an isolated local database and SMTP catcher, use the checked-in native supervisor:

    $env:AUTH_ACCESS_TOKEN_SECRET = '<local-only base64url secret supplied out of band>'
    npm run local:prepare
    npm run local:check
    npm run local:up
    npm run local:smoke

The ignored `.local` directory is disposable development state, not a Production backup. Stop it with `npm run local:down`; do not run destructive database commands against a shared or Production target.

## Environments and fail-closed boundaries

| Environment | Data | Database | Private storage/scanner | External providers |
|---|---|---|---|---|
| Local | Synthetic only | Local replica set | Isolated local/test adapters | Deterministic fakes |
| Test | Isolated fixtures | Ephemeral or in-memory test boundary | Deterministic storage/scanner fixtures | Deterministic fakes |
| Preview/UAT | Synthetic UAT | Isolated replica set | Encrypted private non-Production namespace and approved sandbox scanner | Sandbox providers |
| Production | Real approved data | Managed or approved replica set | Encrypted private storage and approved scanner | Approved live providers |

Preview, UAT, and Production must not fall back to local storage or bypass malware scanning when configuration is absent. The repository implements the SMTP OTP adapter; Production delivery remains unavailable until the Hostinger mailbox credentials and DNS records are configured outside source control and a real delivery test succeeds. Missing external configuration makes readiness conditional or blocked; it is never replaced with a fabricated success value.

Required API configuration names are APP_ENV, API_HOST, API_PORT, MONGODB_URI, and AUTH_ACCESS_TOKEN_SECRET. Web configuration names used by the SSR server are WEB_HOST, WEB_PORT, WEB_API_ORIGIN, and WEB_PUBLIC_ORIGIN. Values are supplied by the process manager or shell and must not be committed.

## Processes and route boundaries

### API

- GET /health is process liveness and intentionally remains outside /api/v1.
- GET /ready is dependency readiness and reports MongoDB plus configured OTP/private-document dependencies.
- Product routes use /api/v1 exactly once.
- The executable runtime inventory, OpenAPI, and Postman validators are the parity checks for active API routes. Planned blueprint rows are not active routes.
- API authentication, permission, scope, ownership, validation, rate limits, redacted logging, and private-file delivery are authoritative. Web route guards do not replace them.

Run the route and contract checks with:

    npm.cmd run api:inventory
    npm.cmd run openapi:validate
    npm.cmd run postman:validate

### Web

The route table owns the following route groups:

- Public: /, /properties, /properties/:slug, /compare, /developers, /developers/:slug, /articles, /articles/:slug, /community, /about, and /team.
- Authentication and provider application: /auth/* and /provider-application/*.
- Seeker dashboard: /seeker/*.
- Provider dashboard: /provider/*.
- Admin dashboard: /admin/*.
- Unmatched paths resolve through the explicit not-found route.

Public and authentication surfaces support desktop, tablet, and mobile. Seeker, Provider, and Admin dashboard scopes are desktop-only unless a newer approved source changes that rule. Arabic direction is RTL; English and Simplified Chinese direction is LTR.

Production Web artifacts are built by npm.cmd run build --workspace apps/web, which produces the client assets and SSR entrypoint. The production process is npm.cmd run start --workspace apps/web; it must receive a valid public origin before sitemap generation can be considered ready.

## Roles and permission operations

The current administrative roles are Super Admin, Account Reviewer, Property and Project Reviewer, Content Editor, Community Moderator, Ads and Payments Manager, Support and Follow-up Agent, and View Only. The complete permission matrix is agent_pack/01_product/ROLES_PERMISSIONS_MATRIX.md.

- permissions and availableActions come from the API projection.
- View Only users can read permitted projections but cannot mutate or approve.
- UI-hidden actions are not an authorization control; the API must reject unauthorized, cross-owner, and cross-tenant requests.
- Seekers and unrelated Providers never receive internal notes, assignments, audit data, private documents, payment proofs, or financial internals.
- Private document and payment-proof delivery is fresh-authorization, short-lived, and never a permanent public URL.
- Sensitive changes require the defined reason and produce auditable actor/target/before/after/trace evidence.
- Advertising prices come from administrative quotes; commission is policy/exception based. No universal price or commission is supplied by this guide.

## Health, readiness, and smoke checks

Use /health to distinguish a live process from a ready service. A 200 health response does not prove MongoDB, OTP, private storage, scanner, or other provider readiness. Use /ready for orchestration and Preview/UAT gates.

The local Web smoke must verify the built SSR process for at least one Arabic RTL request and one English or Simplified Chinese LTR request, crawler documents, static asset delivery, security headers, and explicit not-found behavior. It must use loopback or an isolated non-Production origin and must not use real credentials or data. The executable test is apps/web/tests/preview-deployment.vitest.test.ts.

## Troubleshooting

### Web returns an SSR error or only a shell

1. Confirm npm.cmd run build --workspace apps/web completed and both dist/client and dist/server artifacts exist.
2. Confirm WEB_PUBLIC_ORIGIN is a valid origin without credentials, path, query, or fragment.
3. Confirm WEB_API_ORIGIN points to the intended isolated API and that the API route inventory is current.
4. Check the rendered response status and redacted server logs. Do not print access tokens, refresh tokens, cookies, private URLs, or API secrets.

### API reports not ready

1. Call /health and /ready separately.
2. Inspect only the readiness check names and safe environment diagnostics.
3. Confirm the isolated MongoDB replica set is reachable.
4. In Preview/UAT, configure the approved OTP, private storage, and scanner adapters. Do not enable an insecure local fallback.

### Authentication or permissions appear wrong

1. Confirm the session is valid and the refresh cookie follows the HttpOnly, path, SameSite, and environment-secure policy.
2. Confirm the API response permissions and availableActions for the actor.
3. Reproduce the request against the API with an isolated test identity and verify unauthorized and IDOR responses.
4. Treat UI state as a projection, never as permission authority.

### Upload or private-file behavior is unavailable

This is expected when higher-environment storage or scanner adapters are unconfigured. Keep the capability disabled and readiness honest. Never expose storage keys or turn a private file into a permanent URL to make a smoke test pass.

### Artifact or contract drift

Run npm.cmd run api:inventory, npm.cmd run openapi:validate, npm.cmd run postman:validate, npm.cmd run build, and node agent_pack/scripts/audit_pack.mjs. Fix the owning runtime/contract artifact; do not mark planned routes as implemented.

## Release and rollback

The intended release sequence is:

1. Run typecheck, lint, tests, build, dependency audit, API inventory, OpenAPI/Postman validation, environment validation, and Agent Pack audit.
2. Build immutable API and Web artifacts from the reviewed source and lockfile.
3. Run migration/index checks against an isolated target, then deploy Preview with synthetic data and configured fail-closed providers.
4. Run health/readiness and Web SSR smoke checks, then capture UAT and backup/restore evidence.
5. Promote only after the release gate and external operational prerequisites are approved.
6. Monitor health/readiness, error rate, security logs, storage/scanner readiness, and critical journeys after promotion.

Rollback means redeploying the last known-good immutable application artifact and restoring the documented deployment configuration. Database rollback is not an automatic destructive reversal: use the approved backup/restore drill and migration policy against an isolated target first. Never delete Production data, rewrite audit history, rotate secrets through source control, or run a rollback command without an identified target, owner, and recovery point.

The repository currently does not prove a deployed native Ubuntu host, managed MongoDB replica set, private storage/scanner, real OTP provider, monitoring system, backup/restore drill, or external security assurance. Those are release-readiness prerequisites, not claims made by local tests.

## Verification handoff

The normal local quality gate is:

    npm.cmd run typecheck
    npm.cmd run lint
    npm.cmd test
    npm.cmd run build
    npm.cmd audit --audit-level=high
    npm.cmd run env:check
    npm.cmd run api:inventory
    npm.cmd run openapi:validate
    npm.cmd run postman:validate
    npm.cmd run test:visual --workspace apps/web
    npm.cmd run test:a11y --workspace apps/web
    node agent_pack/scripts/audit_pack.mjs

npm.cmd run security:check is not currently defined in the repository and must not be reported as passed. Existing API security tests, browser/session security tests, artifact assertions, and dependency audit remain the available repository-owned security evidence.

The owner-approved DESIGN-EXCEPTION-ADM-54 is an accepted direct-reference comparison waiver. It must remain disclosed in release evidence; it never means that direct ADM-54 pixel comparison occurred.
