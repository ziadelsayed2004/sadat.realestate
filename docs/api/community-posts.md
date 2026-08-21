# Community Posts

Authenticated verified seekers, providers, and administrators can create bounded posts owned by their account through `POST /api/v1/public/community/posts`. Posts begin as drafts, cannot be edited or removed by another author, and require explicit moderation before public publication. Removed and hidden posts are excluded from public projections. Public listing and detail are exposed through `GET /api/v1/public/community/posts` and `GET /api/v1/public/community/posts/:postId`; both return explicit projections without author identity or moderation state.

Verified administrators with `admin:community.view` can review the paginated administrative projection through `GET /api/v1/admin/community/posts`. The endpoint accepts strict `page`, `limit`, `status`, and text `search` filters, uses deterministic updated-time ordering, and returns author identity and moderation state only inside this permission-checked administrative boundary.
