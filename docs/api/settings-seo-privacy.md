# SEO and public privacy settings

SEO settings are strict localized values for title and description, a validated canonical URL, and an explicit robots directive. They use draft, published, and inactive states; only published settings are projected publicly. No default domain or fabricated copy is inserted.

Privacy policies are localized, versioned records keyed by a stable logical key. A policy is public only when published and effective; drafts, inactive records, and published records without an effective timestamp remain unavailable. These settings contain editorial policy text only and reject unknown fields. Credentials, tokens, private keys, and other secrets are not part of the contract.

The unified administrator settings boundary now owns transport through `GET`/`PUT /api/v1/admin/settings/:namespace`. SEO and privacy records retain their publication-safe domain models; this endpoint does not fabricate missing copy. Empty and draft states remain safe while final legal/SEO content is unavailable.
