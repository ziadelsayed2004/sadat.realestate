# Security Baseline

## Identity & Sessions

- Argon2id لكلمات المرور، OTP hashed + TTL + attempt limits.
- access token قصير، opaque refresh hashed مع rotation/reuse detection.
- logout/revocation، secure HttpOnly SameSite cookie، no token in localStorage.

## Authorization

- AuthN ثم RBAC ثم object ownership/scope.
- allowlist fields لمنع mass assignment.
- negative IDOR matrix لكل endpoint حساس.

## Inputs & MongoDB

- runtime schemas، reject unknown fields حيث يلزم، منع operators/prototype pollution.
- allowlisted filter/sort، limits، timeouts، وsafe regex policy.

## Uploads

- MIME + magic bytes + size/count، أسماء مولدة، private/public separation.
- لا path من المستخدم، لا SVG/HTML نشط بلا sanitization، وفحص malware adapter عند الإنتاج.

## Web

- Helmet/CSP، CORS allowlist، CSRF analysis، output escaping، open redirect allowlist.
- sensitive pages no-store، logs redacted، errors لا تكشف stack في production.

## Operations

- least privilege DB/storage، secrets rotation، audit، backups، dependency scanning.
- لا Production E2E أو destructive seed دون بيئة معزولة وموافقة واضحة.
