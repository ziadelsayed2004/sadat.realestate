# OpenAPI and Postman foundation

The executable API documentation contains implemented routes only. The runtime surface includes:

- `GET /health` for process liveness.
- `GET /ready` for dependency readiness.
- shared authentication, seeker self-service, and provider-onboarding routes under `/api/v1`;
- private provider-document upload, access-grant, deletion, and exact-object signed-download redemption routes.
- reason-bearing Admin account-transition and atomic Provider-review routes.
- reason-bearing RBAC mutations and permission-gated Admin audit-log list/detail routes.
- permission-gated Admin location and neighborhood list/create/update/delete routes with optimistic versions and guarded deletion.
- permission-gated Admin property-category/type list/create/update/delete routes with hierarchy, optimistic versions, and guarded deletion.

These operational probes intentionally stay at the process root and keep their unwrapped bodies. Product endpoints added by dependency-ready tasks use `/api/v1` exactly once and use the shared success and error envelopes.

## OpenAPI

`apps/api/openapi/openapi.json` is an OpenAPI 3.1 document using the JSON Schema 2020-12 dialect. The custom `x-product-api-base-path` field records `/api/v1` without pretending that planned product endpoints are active. Reusable envelope and operational response schemas live under `components`.

When a product route becomes executable, add its complete path beginning with `/api/v1`, request validation, response schemas, security requirements, errors, and tests in the same task. Never prepend `/api/v1` through both a server URL and a path.

## Postman

The collection contains the operational and currently implemented product requests. It defines:

- `baseUrl`, with a safe loopback default for root operational probes.
- `apiV1BaseUrl`, defined as `{{baseUrl}}/api/v1` for future implemented product requests.

The checked-in local environment contains synthetic loopback values only. Tokens, credentials, production origins, real account data, and secret-typed variables must not be committed. Future product requests must use `{{apiV1BaseUrl}}`; operational probes continue to use `{{baseUrl}}`.

## Drift prevention

`npm run openapi:validate` and `npm run postman:validate` compare documented requests with the runtime route inventory, validate the product base path and local references, require safe variables, and reject secret-shaped environment entries. Focused tests exercise both valid artifacts and negative cases such as unimplemented routes, duplicate prefixes, unresolved references, and checked-in credentials.
