# Provider notification center

The provider notification center is authenticated, recipient-owned, and limited to a verified provider bearer session.

Routes:

- `GET /api/v1/provider/notifications` lists bounded localized notifications with unread count, pagination, `unreadOnly`, and type filters.
- `POST /api/v1/provider/notifications/:notificationId/read` marks one owned notification read.
- `POST /api/v1/provider/notifications/read-all` marks all owned provider notifications read and returns the changed count.

The API filters by the authenticated provider subject and the explicit `provider` audience. Foreign notification IDs are indistinguishable from not found. Response projections contain only the notification contract fields; internal permissions, audit data, assignments, and provider-private records are not returned.
