# Backend Architecture

## Layers

Route -> authentication, rate limit, and validation -> Controller -> Application Service -> Domain Policy -> Repository or Provider -> Response Mapper.

## Modules

Identity, auth, admin RBAC, accounts, audit, locations, taxonomy, organizations, providers, projects, properties, media, search, favorites, requests, viewings, notifications, articles, community, moderation, ads, payments, commissions, settings, and reports.

## Principles

- REST under `/api/v1` with OpenAPI 3.1 contracts.
- Shared runtime schemas, strict TypeScript, and no implicit any.
- Mongoose schemas with explicit indexes, timestamps, and optimistic concurrency where drafts exist.
- Prefer single-document atomicity. Use transactions only across aggregates and only with replica-set support.
- Use a transactional outbox for events that cannot be lost, with idempotent workers, retry, and dead-letter handling.
- Every list endpoint uses allowlisted filters, sort, and search plus bounded page or cursor pagination.
- Every sensitive response uses an explicit projection, never raw model serialization.

## Documentation and Tests

- Every implemented route appears in OpenAPI, runtime inventory, and Postman, or is explicitly classified as internal.
- Every mutation includes positive, unauthenticated, unauthorized or ownership, validation, and invalid-transition coverage.
- Sensitive operations include idempotency, replay, and concurrency tests where applicable.
