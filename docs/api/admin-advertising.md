# Admin advertising requests

The administrative advertising request projection is available through the implemented `/api/v1` routes:

- `GET /api/v1/admin/ad-requests` lists bounded requests with optional `status`, `providerId`, `page`, and `limit` filters.
- `GET /api/v1/admin/ad-requests/:adRequestId` returns one request projection.

Both routes require a verified administrator and the `admin:ads.view` permission. Results contain the request and, when present, the latest manual quote. Payment-proof storage keys, private files, request history, and unrelated audit data are not returned by this projection.

The role editor offers an Advertising manager preset containing only `admin:ads.view`, `admin:ads.price`, and `admin:ads.schedule`. Selecting pricing or scheduling also selects viewing, including when editing an existing role lacking it; the role must be saved and assigned to the employee. Payment permissions remain separate. The API continues to enforce the exact read permission; it does not infer new grants from pricing or scheduling.

Advertising JSON requests renew a session once after a 401, then retry with the current bearer token. A 403 never triggers renewal or permission bypass. Failed renewal, sign-out, cancellation, and a second 401 stop the retry. The requests page explains the required active role and viewing permission and offers an explicit retry after the account configuration is corrected.

Ordering is deterministic (`createdAt` descending, then `_id` descending), pagination is bounded to 100 items per request, and missing request IDs use the not-found boundary.

Assisted requests show the provider contact phone and purpose. A waiting-pricing detail includes active, policy-permitted named placements and configured ad types. The quote mutation accepts a `campaign` object with placement, optional policy-required ad type, start and end. Campaign and quote commit atomically; incomplete, expired and reversed periods fail closed. The assisted quote UI accepts EGP and converts to integer minor units. Date fields use Africa/Cairo, independent of the device, with summer/winter offsets and an elapsed duration preview. Accepting a quote does not approve payment. Scheduling still requires an owned, active, clean, approved proof and rejects overlapping reservations. Scheduling the request does not create or publish a banner creative; the administrator manages that separate step in Banners.
