# SEO and public privacy settings

SEO settings are strict localized values for title and description, a validated canonical URL, and an explicit robots directive. They use draft, published, and inactive states; only published settings are projected publicly. No default domain or fabricated copy is inserted.

Privacy policies are localized, versioned records keyed by a stable logical key. A policy is public only when published and effective; drafts, inactive records, and published records without an effective timestamp remain unavailable. These settings contain editorial policy text only and reject unknown fields. Credentials, tokens, private keys, and other secrets are not part of the contract.

The unified administrator settings boundary owns writes through `GET`/`PUT /api/v1/admin/settings/:namespace`. Complete SEO values have a separate read-only public projection at `GET /api/v1/public/settings/seo`; it excludes version, actor, audit, and unrelated administrative fields. SSR applies the localized homepage defaults, canonical origin, optional title separator and Google verification meta, while the robots policy and sitemap status control crawler documents. Missing or invalid values return 404 and SSR retains its audited static defaults. Privacy content remains unavailable publicly until its separate publication workflow is connected.
