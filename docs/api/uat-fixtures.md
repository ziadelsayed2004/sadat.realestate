# Deterministic UAT fixtures

`apps/api/src/modules/fixtures/catalog.ts` provides a pure, injectable UAT catalog. It creates one strict synthetic fixture for each of the five runtime surfaces (`operational`, `public`, `seeker`, `provider`, and `admin`) and each common interface state: loading, empty, error, retry, success, missing image, long text, expired, and unavailable.

The catalog uses stable logical keys such as `public.empty` and `admin.long_text`, English placeholder labels, empty collections, and explicit adapter-unavailable states. It contains no real users, credentials, tokens, private documents, production content, population/KPI values, financial totals, or operational claims. The contracts require `synthetic: true` and reject unknown fields.

The pure catalog remains non-persistent. UAT tooling or tests may inject `createUatFixtureCatalog()` into adapters and renderers; it does not silently write to MongoDB or object storage.

The explicitly invoked `local-showcase-v1` and `local-showcase-v2` MongoDB seeds supply a small public and authenticated preview: synthetic approved developers/provider types, seeker and admin permission variants, locations, projects, properties, article/category, community post, homepage content, requests, viewings, favorites, notifications, advertising quote/payment metadata, and commission policy/confirmation/snapshot records. Every inserted document is marked `synthetic: true` and its seed key. Local-only administrator credentials use the documented preview password and are never accepted by Production; OTP delivery remains deterministic through the local catcher. Payment proofs contain private storage metadata only and no public file URL. The seeds are idempotent and the environment guard still refuses Staging and Production.

Run it only after the Local or UAT MongoDB replica set is ready:

```bash
npm run db:seed
```

The native Local supervisor applies the seed automatically; use `npm run local:seed` to reapply it. Production readiness continues to fail closed when SMTP, ClamAV, private storage, signing secrets, or other approved providers are not configured.
