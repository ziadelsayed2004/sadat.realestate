# Public property details

`GET /api/v1/public/properties/:slug` is unauthenticated and resolves only a published, active property. The projection includes localized property data, an explicit persisted source type, published project context, SEO title/description/slug, ready active media metadata, and published active related property cards.

Draft, hidden, inactive, review, provider, contact, storage-key, checksum, processing-state, and other internal fields are excluded. Unknown slugs return a stable 404 response; malformed slugs are rejected before any database query. If production media or related content is absent, the response uses safe empty arrays.
