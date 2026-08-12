# Security Baseline

## Identity and Sessions

- Use Argon2id for passwords and hashed OTP challenges with TTL and attempt limits.
- Use short-lived access tokens and hashed opaque refresh tokens with rotation and reuse detection.
- Support logout and revocation with Secure, HttpOnly, SameSite cookies; never store tokens in localStorage.

## Authorization

- Apply authentication, then RBAC, then object ownership or scope.
- Allowlist mutable fields to prevent mass assignment.
- Maintain a negative IDOR matrix for every sensitive endpoint.

## Inputs and MongoDB

- Use runtime schemas, reject unknown fields where appropriate, and prevent operators and prototype pollution.
- Allowlist filters and sorting; enforce limits, timeouts, and a safe regex policy.

## Uploads

- Validate MIME, magic bytes, size, and count; generate file names and separate public from private assets.
- Never accept a user-controlled storage path. Sanitize active SVG/HTML if allowed, and use a malware-scanning adapter in production.

## Web

- Apply Helmet and CSP, CORS allowlists, CSRF analysis, output escaping, and open-redirect allowlists.
- Mark sensitive pages no-store, redact logs, and hide production stacks.

## Operations

- Use least-privilege database and storage access, secret rotation, audit, backups, and dependency scanning.
- Never run destructive seed or production E2E operations without an isolated environment and explicit authorization.
