# Article Management

Articles are persisted in the strict `articles` collection with unique slugs, localized title/body/SEO values, optional governed cover-asset references, server-derived authors, timestamps, actor metadata, and optimistic versions. The administrator cannot mass-assign the author.

Implemented routes:

- `GET /api/v1/admin/articles` — requires `admin:content.view`; supports bounded state/category/search filters and pagination.
- `POST /api/v1/admin/articles` — requires `admin:content.manage`; creates a draft in an active category.
- `PATCH /api/v1/admin/articles/:articleId` — requires `admin:content.manage`; drafts are editable, and published edits additionally require `admin:content.publish`. The current version is mandatory.
- `POST /api/v1/admin/articles/:articleId/transitions` — draft submission requires `admin:content.manage`; review, publish, archive, and restore actions require `admin:content.publish`. Every transition also requires the current version and a reason.

The review lifecycle is `draft → pending_review → published → archived → draft`. Review can also return `pending_review → draft`. Administrators with both `admin:content.manage` and `admin:content.publish` can publish a completed draft directly. The current Super Admin, resolved from server-side RBAC, receives direct publishing instead of Submit for review on drafts; submitting a Super Admin draft for review is rejected. Assigned employees retain Submit for review, and their transition responses never expose publisher actions without publishing permission. Existing pending-review articles remain publishable by authorized reviewers. Other undefined transitions are rejected. Publication requires nonempty content in at least one language and an active category, assigns `publishedAt`, and writes a bounded metadata audit snapshot. Full article bodies are excluded from audit snapshots. Optimistic versions reject replayed and stale mutations.

The editor offers Save draft and Save and publish article. The latter saves the fields and scanned images, then publishes the returned version. If publication fails after saving, the editor retains the saved draft ID and version so retry updates the same draft. Paragraphs, line breaks and tabs are preserved; unsupported control characters from pasted text are removed without truncating the article. Content remains limited to 20000 characters per language, with a specific error for longer text.
