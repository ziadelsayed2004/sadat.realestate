# Security Baseline

## Identity and Sessions

- Use Argon2id for passwords and hashed OTP challenges with TTL and attempt limits.
- Use short-lived access tokens and hashed opaque refresh tokens with rotation and reuse detection.
- Support logout and revocation with Secure, HttpOnly, SameSite cookies; never store tokens in localStorage.
- Provision the first Super Admin only through an explicit internal command with strict normalized input, secret injection, a one-time database guard, and an atomic transaction. Never expose an HTTP bootstrap route, log bootstrap credentials, or create a second bootstrap identity when an Admin already exists.

## Authorization

- Apply authentication, then RBAC, then object ownership or scope.
- Allowlist mutable fields to prevent mass assignment.
- Maintain a negative IDOR matrix for every sensitive endpoint.

## Inputs and MongoDB

- Use runtime schemas, reject unknown fields where appropriate, and prevent operators and prototype pollution.
- Allowlist filters and sorting; enforce limits, timeouts, and a safe regex policy.

## Uploads

- Stream uploads where possible and enforce authenticated rate, multipart/body, size, count, extension, declared-MIME, and detected-magic-signature limits before persistent storage. Never trust declared MIME alone or accept zero-byte, malformed, truncated, double-extension, active-content, archive, executable, script, or indeterminate files.
- Generate opaque object keys server-side. Never form a storage path from a filename, path, category, ID, or extension supplied by a user. Retain only sanitized display filenames with path components/control characters removed and an approved length limit.
- Separate public and private namespaces, preferably buckets. Provider documents and payment proofs have no public ACL, public CDN, permanent URL, static-file exposure, or response-visible storage key.
- Place every private upload in quarantine and scan through a separate malware-scanner adapter. Security state is independent from business review state. An unavailable scanner, `infected`, or `scan_failed` result fails closed; only `clean` may be reviewed or downloaded. Never send private documents to a public scanner that may retain or learn their contents.
- Authorize every private read using authentication, permission, ownership/assignment/review scope, non-deleted state, and `clean` state. Issue only an exact-object GET URL valid for 300 seconds with attachment and private/no-store behavior. Never persist, log, audit, analyze, list, or include the signed URL in errors.
- Require TLS in transit and storage-side encryption at rest in Preview/UAT/Production. Credentials remain validated environment configuration, are least privilege and environment-specific, and never appear in storage metadata, logs, examples, contracts, Postman, or evidence.
- Apply the approved lifecycle retention schedule and reason-bearing legal/compliance holds. Deletion is idempotent, revokes every access path, and retains only explicitly allowed non-sensitive tombstone metadata.

## Web

- Apply Helmet and CSP, CORS allowlists, CSRF analysis, output escaping, and open-redirect allowlists.
- Mark sensitive pages no-store, redact logs, and hide production stacks.

## Operations

- Use least-privilege database and storage access, secret rotation, audit, backups, and dependency scanning.
- Never run destructive seed or production E2E operations without an isolated environment and explicit authorization.
- Missing Preview/UAT/Production private storage or scanner configuration makes upload capability unavailable and readiness fail honestly; Production must never use an insecure local-storage or scanner bypass.
