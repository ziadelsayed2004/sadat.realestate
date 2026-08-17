# Article Management

Articles are persisted in the strict `articles` collection with unique slugs, localized title/body/SEO values, optional governed cover-asset references, server-derived authors, timestamps, actor metadata, and optimistic versions. The administrator cannot mass-assign the author.

Implemented routes:

- `GET /api/v1/admin/articles` — requires `admin:content.view`; supports bounded state/category/search filters and pagination.
- `POST /api/v1/admin/articles` — requires `admin:content.manage`; creates a draft in an active category.
- `PATCH /api/v1/admin/articles/:articleId` — requires `admin:content.manage`; only drafts are editable and the current version is mandatory.
- `POST /api/v1/admin/articles/:articleId/transitions` — draft submission requires `admin:content.manage`; review, publish, archive, and restore actions require `admin:content.publish`. Every transition also requires the current version and a reason.

The enforced lifecycle is `draft → pending_review → published → archived → draft`. Review can also return `pending_review → draft`. Direct draft publication and every other undefined transition are rejected. Publication assigns `publishedAt`, requires an active category, and writes a bounded metadata audit snapshot. Full article bodies are deliberately excluded from audit snapshots. Optimistic version checks reject duplicate/replayed or concurrent stale mutations.
