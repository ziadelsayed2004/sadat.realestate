# Deterministic UAT fixtures

`apps/api/src/modules/fixtures/catalog.ts` provides a pure, injectable UAT catalog. It creates one strict synthetic fixture for each of the five runtime surfaces (`operational`, `public`, `seeker`, `provider`, and `admin`) and each common interface state: loading, empty, error, retry, success, missing image, long text, expired, and unavailable.

The catalog uses stable logical keys such as `public.empty` and `admin.long_text`, English placeholder labels, empty collections, and explicit adapter-unavailable states. It contains no real users, credentials, tokens, private documents, production content, population/KPI values, financial totals, or operational claims. The contracts require `synthetic: true` and reject unknown fields.

This boundary is intentionally non-persistent. UAT tooling or tests may inject `createUatFixtureCatalog()` into adapters and renderers; it does not silently seed MongoDB or object storage. The existing development seed command remains a guarded no-op until an approved domain-specific seed step is supplied. Local/Test scanner and storage fakes remain deterministic, while UAT/Production readiness still fails closed when approved external providers are not configured.
