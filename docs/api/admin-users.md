# Administrator accounts

The administrator account boundary is implemented by:

- `GET /api/v1/admin/admin-users`
- `GET /api/v1/admin/admin-users/:adminId`
- `POST /api/v1/admin/admin-users`
- `PATCH /api/v1/admin/admin-users/:adminId`

List/detail reads require `admin:staff.view`; create/update/disable/enable operations require `admin:staff.manage`. Responses contain normalized email, display name, access level, lifecycle status, version, timestamps, and safe available actions only. Credentials and password material are never accepted or returned by this boundary.

The repository persists the user identity, an admin profile, and an administrator projection in one transaction. New administrator accounts start as verified for the account boundary; credential provisioning remains the explicit bootstrap/auth responsibility and is not fabricated by these routes.

Mutations use optimistic versions and bounded reasons. An administrator cannot disable or demote the currently authenticated account, and the last active Super Admin cannot be disabled or demoted. Sensitive create/update changes write a redacted audit event in the same transaction when the production audit writer is configured.
