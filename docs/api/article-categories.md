# Article Categories

Article categories are persisted in the strict `article_categories` collection. They use unique stable slugs, localized name/description values, bounded display ordering, an explicit active flag, timestamps, actor metadata, and optimistic versions. Query-driven indexes cover public ordering, administrator filtering, slug uniqueness, and localized text search.

Implemented routes:

- `GET /api/v1/admin/article-categories` — requires `admin:content.view` and supports bounded filtering, search, sorting, and pagination.
- `POST /api/v1/admin/article-categories` — requires `admin:content.manage` and a mutation reason.
- `PATCH /api/v1/admin/article-categories/:categoryId` — requires `admin:content.manage`, a reason, and the current version.
- `DELETE /api/v1/admin/article-categories/:categoryId` — requires `admin:content.manage`, a reason, and the current version; referenced categories cannot be deleted.
- `GET /api/v1/public/article-categories` — anonymous, cacheable, active-only localized metadata for public filters.

All mutation payloads are strict. The API rejects unknown fields, duplicate slugs, stale versions, and attempts to delete referenced categories. Every accepted mutation writes a reason-bearing audit record. Localized CMS values remain separate from interface translation keys.
