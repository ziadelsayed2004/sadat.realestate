# Unified administrator settings

The administrator settings API exposes a strict, versioned namespace boundary:

- `GET /api/v1/admin/settings/:namespace` requires `admin:settings.view`.
- `PUT /api/v1/admin/settings/:namespace` requires `admin:settings.manage`.
- `GET /api/v1/public/settings/seo` is anonymous and returns only a complete validated SEO projection: localized title/description, canonical origin, robots policy, sitemap status, and optional title separator and Google site-verification value. It never exposes version, actor, audit, or unrelated administrative values and returns 404 when the required namespace values are missing or invalid.

Supported namespaces are `platform`, `contact`, `social`, `properties`, `requests`, `advertising`, `seo`, `privacy-security`, and `display`. Values use stable logical keys and a bounded scalar/localized value contract; unknown fields, control characters, credentials, tokens, private keys, and other secrets are rejected.

Updates include `schemaVersion`, `expectedVersion`, `values`, and a human-readable `reason`. New namespaces start at version `0`; later writes require the current version and increment it atomically. A schema-version change for an existing namespace is rejected so migrations remain explicit and reviewable.

The editor retains the form, name and change reason when a write conflicts. Saving stays blocked until “Load latest and keep my edits” succeeds. This read merges only the user's changed fields (each localized language independently) into the latest values; unchanged fields and new server values are retained. The saved-name summary shows the latest server name beside the editable draft. The administrator must review and explicitly save again with the freshly loaded version; recovery never writes automatically. Failed recovery retains the draft and keeps the stale write blocked. An in-flight guard prevents double submission of the same version.

Every successful create or update records an administrator audit event with the namespace, before/after safe projections, request/trace identifiers, and reason. Responses never include credentials or storage internals. A missing namespace returns an unavailable (`404`) response rather than fabricated production values, which keeps empty and draft environments safe.
