# Unified administrator settings

The administrator settings API exposes a strict, versioned namespace boundary:

- `GET /api/v1/admin/settings/:namespace` requires `admin:settings.view`.
- `PUT /api/v1/admin/settings/:namespace` requires `admin:settings.manage`.

Supported namespaces are `platform`, `contact`, `social`, `properties`, `requests`, `advertising`, `seo`, `privacy-security`, and `display`. Values use stable logical keys and a bounded scalar/localized value contract; unknown fields, control characters, credentials, tokens, private keys, and other secrets are rejected.

Updates include `schemaVersion`, `expectedVersion`, `values`, and a human-readable `reason`. New namespaces start at version `0`; later writes require the current version and increment it atomically. A schema-version change for an existing namespace is rejected so migrations remain explicit and reviewable.

Every successful create or update records an administrator audit event with the namespace, before/after safe projections, request/trace identifiers, and reason. Responses never include credentials or storage internals. A missing namespace returns an unavailable (`404`) response rather than fabricated production values, which keeps empty and draft environments safe.
