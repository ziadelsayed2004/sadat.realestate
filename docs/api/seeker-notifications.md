# Seeker notification center

The seeker notification center is authenticated and recipient-owned:

- `GET /api/v1/seeker/notifications` returns a bounded, deterministic inbox with `page`, `limit`, `total`, `unreadCount`, and an optional `unreadOnly`/`type` filter.
- `POST /api/v1/seeker/notifications/:notificationId/read` marks only the authenticated seeker's notification as read. Replays are idempotent; another seeker's ID is not discoverable.
- `POST /api/v1/seeker/notifications/read-all` marks all currently unread notifications for the authenticated seeker and returns the changed count.

Titles and messages use the supported `ar`, `en`, and `zh-CN` localized content shape. Links are optional relative application paths only; absolute URLs, credential-bearing query parameters, storage identifiers, and notification internals are never projected. Empty or unprovisioned notification collections return a truthful empty inbox and zero unread count.
