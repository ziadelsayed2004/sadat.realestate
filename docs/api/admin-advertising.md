# Admin advertising requests

The administrative advertising request projection is available through the implemented `/api/v1` routes:

- `GET /api/v1/admin/ad-requests` lists bounded requests with optional `status`, `providerId`, `page`, and `limit` filters.
- `GET /api/v1/admin/ad-requests/:adRequestId` returns one request projection.

Both routes require a verified administrator and the `admin:ads.view` permission. Results contain the request and, when present, the latest manual quote. Payment-proof storage keys, private files, request history, and unrelated audit data are not returned by this projection.

Ordering is deterministic (`createdAt` descending, then `_id` descending), pagination is bounded to 100 items per request, and missing request IDs use the not-found boundary.
