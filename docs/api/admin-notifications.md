# Admin notification center

The admin notification center is a verified-admin, recipient-owned inbox:

- `GET /api/v1/admin/notifications` returns a bounded deterministic list with `page`, `limit`, `total`, `unreadCount`, and optional `unreadOnly`/`type` filters.
- `POST /api/v1/admin/notifications/:notificationId/read` marks only the authenticated administrator's notification as read. Replays are idempotent and another recipient's identifier is not discoverable.
- `POST /api/v1/admin/notifications/read-all` marks the authenticated administrator's currently unread notifications and returns the changed count.

Notification records opt into the explicit `admin` audience. A source may also declare an admin permission such as `admin:requests.view`; the service asks its authorization adapter before projecting that record. Missing or denied permission removes the record from the safe projection. Returned titles, messages, and links are allowlisted, localized with the supported `ar`, `en`, and `zh-CN` shape, and links are relative application paths only. Credentials, storage keys, internal source metadata, and absolute URLs are never returned.

The current runtime uses the existing notification repository adapter and remains safe with an empty or unprovisioned collection. Persistent notification production data and a live replica-set integration check are deployment prerequisites, not fabricated fixtures.
