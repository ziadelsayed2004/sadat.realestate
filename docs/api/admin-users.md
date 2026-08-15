# Administrator accounts

The planned administrator-user endpoints are `GET /api/v1/admin/admin-users`, `POST /api/v1/admin/admin-users`, and `PATCH /api/v1/admin/admin-users/:adminId`. List/detail reads require `admin:staff.view`; create/update/disable operations require `admin:staff.manage`. Responses contain normalized email, display name, access level, lifecycle status, version, timestamps, and safe available actions only. Credentials and password material are never accepted or returned by this boundary.

Mutations use optimistic versions and bounded reasons. An administrator cannot disable or demote the currently authenticated account, and the last active Super Admin cannot be disabled or demoted. The current runtime has no persistent administrator repository or HTTP composition, so this implementation is an adapter boundary; credential provisioning remains the explicit bootstrap/auth responsibility.
