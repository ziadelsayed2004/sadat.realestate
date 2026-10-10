# Administrator accounts

The administrator account boundary is implemented by:

- `GET /api/v1/admin/admin-users`
- `GET /api/v1/admin/admin-users/:adminId`
- `POST /api/v1/admin/admin-users`
- `PATCH /api/v1/admin/admin-users/:adminId`
- `DELETE /api/v1/admin/admin-users/:adminId`

List/detail reads require `admin:staff.view`; mutations require `admin:staff.manage`. Responses contain normalized email, display name, access level, lifecycle status, version, timestamps, and safe available actions only. Optional creation/password updates are hashed before persistence; credential material is never returned.

The repository persists the user identity, an admin profile, and an administrator projection in one transaction. New accounts start as verified, with an optional administrator credential and validated role assignments.

Mutations use optimistic versions and bounded reasons. An administrator cannot disable or demote the currently authenticated account, and the last active Super Admin cannot be disabled or demoted. Sensitive create/update changes write a redacted audit event in the same transaction when the production audit writer is configured.

Deletion accepts only `{ "expectedVersion": 3 }` and returns `{ "id": "…", "deleted": true, "version": 4 }`. The dashboard requires confirmation showing the account name/email; no manual reason is needed. The transaction suspends and tombstones the identity, revokes all sessions, deletes login credentials and role assignments, and writes `admin.administrator_deleted` with a server-generated reason. Account/profile and historical references remain for audit integrity; the email remains reserved. Deleted accounts are excluded from staff list/detail and cannot be edited or re-enabled there.

Self deletion and last active Super Admin deletion return 409. Deletion/demotion transactions write the singleton bootstrap record before reading the remaining active Super Admins, so conflicting transactions retry with fresh state. Missing bootstrap protection fails closed for removal of an active Super Admin. The list only offers deletion to staff managers, excluding their current account and the last active Super Admin.
