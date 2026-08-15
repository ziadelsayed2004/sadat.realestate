# Negative authorization matrix

`apps/api/src/modules/security/authorization-matrix.ts` derives an authorization policy for every route in the canonical runtime inventory. The projection fails when a new route cannot be classified, so a route cannot silently bypass the security review boundary.

The matrix records four access modes:

- `anonymous`: operational, public, login/OTP, and registration routes that intentionally do not require a bearer token.
- `session`: refresh-cookie operations, which fail closed when the refresh session is missing or invalid.
- `role`: verified seeker, provider, or admin bearer access. Admin routes additionally declare a permission boundary and the applicable `custom` or `view_only` RBAC mode.
- `signed_grant`: private provider-document downloads, which use a short-lived signed grant rather than a bearer role.

Every role-protected route carries negative cases for missing authentication and a cross-role token. Object-scoped seeker/provider routes also carry an ownership or assignment boundary; admin routes carry verification and permission boundaries. The focused security tests exercise the shared middleware for missing, invalid, cross-role, unverified-admin, and verified-admin cases, while the domain service/router suites retain the resource-specific IDOR and permission assertions.

This is a test and review projection only. It does not grant access or replace the route middleware/service authorization checks. No production credentials, data, or external provider calls are used.
