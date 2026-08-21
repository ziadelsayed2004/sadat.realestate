# Community Reporting and Moderation

Verified community participants can submit bounded reports with explicit reasons through `POST /api/v1/public/community/posts/:postId/reports`. The acknowledgement exposes only the report identifier, open status, and creation time; reporter identity and moderation fields remain private.

Verified administrators with `admin:community.moderate` can review a paginated explicit projection through `GET /api/v1/admin/community/reports`, filtered by status or post, and can resolve or dismiss an open or in-review report through `POST /api/v1/admin/community/reports/:reportId/resolve`. Resolution requires a current version and a reason of at least five characters; writes are optimistic-concurrency guarded and recorded in the audit stream when audit infrastructure is available. Duplicate reports are rejected by the post/reporter/reason uniqueness boundary. No automated moderation or unsupported abuse scoring is claimed.
