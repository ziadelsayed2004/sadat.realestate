# Public Articles

Implemented public reads are:

- `GET /api/v1/public/article-categories?locale=ar|en|zh-CN`
- `GET /api/v1/public/articles?locale=...&categoryId=...&page=...&limit=...`
- `GET /api/v1/public/articles/:slug?locale=...`

Listing and slug details expose only `published` articles whose category is active. The response is built from an explicit allowlist: identifier, category identifier and safe category metadata, slug, localized title/body/SEO, optional governed cover-asset identifier, and publication timestamp. Author identifiers, audit data, internal workflow state, versions, permissions, and administrative actions are never public.

Requested locales use deterministic fallback to Arabic, then English, then Simplified Chinese. The selected fallback value is returned under the requested locale key, so the frontend consumes one predictable localized projection. Draft, review, archived, and inactive-category content returns no public result. Public responses are cacheable for a short period with stale-while-revalidate support.
