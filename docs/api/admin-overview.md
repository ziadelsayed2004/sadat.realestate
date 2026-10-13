# Admin overview

`GET /api/v1/admin/overview` accepts an explicit ISO-8601 `from`/`to` range (maximum 366 days) and requires a verified administrator with `admin:overview.view`. The response contains only the documented aggregation fields: users, seekers, providers, verified providers, published properties, open requests, and pending reviews, plus the requested range and generation timestamp.

Activity queries use inclusive `from` and exclusive `to` bounds. Published inventory is current and independent of that range. The documented definitions are:

- `users`, `seekers`, and `providers`: users created in the range, with role-specific counts for seekers and providers.
- `verifiedProviders`: provider users created in the range whose account status is `verified`.
- `publishedProperties`: the current total of active properties with status `published`, regardless of publication date. This inventory count is independent of the activity range and includes older published records and legacy records without `publishedAt`.
- `openRequests`: requests created in the range whose status is not `resolved`, `cancelled`, or `closed`.
- `pendingReviews`: the sum of provider applications, projects, and properties with status `pending_review`, plus published active properties with a pending deactivation request, using `updatedAt` in the range.

The service and route validate the aggregation output strictly. The implementation does not seed, estimate, or fabricate KPI values, financial totals, population numbers, or operational claims. Responses are marked `Cache-Control: no-store` and expose no database, permission, audit, or internal review fields.
