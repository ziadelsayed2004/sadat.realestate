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

## Storage and Malware Scanning

- All binary persistence uses a provider-agnostic `StorageAdapter`. Provider documents and payment proofs use a private namespace separate from explicitly public approved media; Production never falls back to local filesystem storage.
- Upload services generate opaque object keys and stream into quarantine without deriving paths from user input. The storage adapter exposes private writes, idempotent deletes, and exact-object GET-only signed delivery; it never exposes buckets, list permissions, public ACLs, or permanent URLs through domain contracts.
- Malware inspection uses an independent scanner adapter. Local/Test use deterministic clean, infected, timeout, and failure fakes. Preview/UAT/Production require a configured approved scanner and fail readiness/capability closed when storage or scanning is unavailable.
- File-security state (`quarantined`, `scan_pending`, `clean`, `infected`, `scan_failed`, `deleted`) is separate from administrative business-review state (`uploaded`, `pending_review`, `needs_replacement`, `approved`, `rejected`). No review or download path is available before `clean`.
- Storage and scanner vendor endpoints, regions, bucket names, and credentials belong only to validated deployment configuration. The approved adapters and invariants are implementation truth even when concrete Production configuration is absent.

## Documentation and Tests

- Every implemented route appears in OpenAPI, runtime inventory, and Postman, or is explicitly classified as internal.
- Every mutation includes positive, unauthenticated, unauthorized or ownership, validation, and invalid-transition coverage.
- Sensitive operations include idempotency, replay, and concurrency tests where applicable.
