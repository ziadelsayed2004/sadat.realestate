# Request Reports and Issues

Administrative request issue routes are implemented under `/api/v1`:

- `GET /admin/request-issues?page=1&limit=20` lists the authenticated administrator's permitted request issues.
- `POST /admin/request-issues/:issueId/resolve` resolves or dismisses an open issue with `action`, `reason`, and `expectedVersion`.

The runtime persists issues in the `request_issues` collection, applies strict shared request contracts, requires verified administrator request-issue permissions for review and resolution, and returns optimistic-concurrency conflicts instead of silently overwriting a newer state.

Authenticated verified seekers, providers, and administrators can create a bounded issue linked to a request. Administrators receive a paginated review projection and resolve or dismiss an issue with an explicit reason and optimistic version. The lifecycle is deterministic and does not claim automated moderation or notification delivery.
