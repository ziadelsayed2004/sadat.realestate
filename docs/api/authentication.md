# Authentication and session contracts

Admin authentication uses normalized email addresses and Admin-only Argon2id passwords. The first Super Admin is provisioned through the protected, one-time transactional command documented in `admin-accounts.md`; there is no HTTP bootstrap route and no checked-in bootstrap credential.

`backend_011` implements Admin password login and the shared session lifecycle. The OTP flow for Seekers and Property Providers binds the challenge only to normalized email, role type, and purpose, then delivers the six-digit code through the configured email adapter. Production uses Hostinger SMTP injected from the target environment; it never logs or returns the code.

## Implemented routes

| Route | Authority | Behavior |
|---|---|---|
| `POST /api/v1/auth/login` | Public, rate limited | Accepts only normalized Admin email and password; returns a signed access token and sets an opaque refresh cookie. |
| `POST /api/v1/auth/otp/send` | Public, globally and per-target rate limited | Creates a five-minute email-bound seeker/provider challenge and delivers it by email. Returns `202` without the code. |
| `POST /api/v1/auth/otp/verify` | Public, rate limited | Consumes a valid challenge once. Login returns the shared session and refresh cookie; registration returns a ten-minute, single-use verification authority. |
| `POST /api/v1/auth/register/seeker` | Verified registration authority | Consumes the seeker OTP authority once, persists the verified email, creates the seeker profile, and returns the shared session with a refresh cookie. |
| `POST /api/v1/auth/refresh` | `sadat_refresh` cookie | Rotates the opaque token exactly once, revokes the predecessor, and detects reuse. |
| `POST /api/v1/auth/logout` | `sadat_refresh` cookie | Revokes the current session and clears the cookie. |

Administrator account recovery is implemented through email OTP and a single-use reset grant. Completing recovery replaces the Argon2id password and revokes existing sessions. Seekers and Providers remain passwordless and authenticate with email OTP. Session listing and per-session management remain planned. OTP registration verification is only an authority: `backend_013` consumes the Seeker grant, while the Provider application creation route implemented by `backend_014` consumes the Provider grant and creates the Provider identity, owned draft application, and shared session atomically.

## Email-only OTP request contracts

The send request requires only `email`, `roleType: seeker | provider`, and `purpose: login | registration`. Verify adds `challengeId` and `code`. Admin OTP is rejected. Email is trimmed and normalized to lowercase. Phone is not accepted in registration, login, OTP, grants, or identity projections; any contact phone remains outside this identity contract.

Send returns `accepted`, a public UUID challenge ID, and expiry/resend durations. Verify requires the same email, role, purpose, challenge ID, and exactly six digits. A login result has `outcome: authenticated` plus the same access-token/user DTO used by Admin login; the opaque refresh token is cookie-only. A registration result has `outcome: verified` plus an opaque verification token and duration. Only the verification token hash is retained, and its repository redemption is compare-and-set so a later registration can consume it once.

Strict runtime schemas reject unknown fields, `admin` roles, unsupported purposes, phone-shaped identity fields, malformed UUIDs, and malformed codes. `INVALID_OTP` deliberately covers missing, expired, mismatched, already-used, and nonexistent-account login challenges. Other public codes are `OTP_ATTEMPTS_EXCEEDED`, `OTP_SEND_RATE_LIMITED`, `OTP_PROVIDER_UNAVAILABLE`, and `ACCOUNT_NOT_ACTIVE`; none includes email, phone, code, provider internals, or stack traces.

## Legacy phone-challenge migration

The versioned `auth_email_only_otp_identity` migration is plan-first and must run against an isolated backup. From the repository root, inspect the redacted plan with `npm run auth:migrate-email-only`; after the database backup and deployment approval, apply it with `npm run auth:migrate-email-only -- --apply --confirm`. It invalidates pending phone-bound challenges, removes legacy OTP phone fields and phone-based OTP indexes, rebuilds the email-target index, and reports Seeker/Provider users that have no email. The command never prints connection strings, SMTP credentials, OTP values, or user contact data.

## Challenge and provider policy

- The code is keyed with a domain-separated HMAC before persistence. A raw code is present only at the delivery boundary and never in a response, log, model JSON, or checked-in environment.
- Challenges expire after five minutes, allow five verification attempts, and impose a 60-second resend cooldown per normalized email, role, and purpose. Replacement, failure, verification, and consumption remove the unique active-key authority.
- MongoDB declares a TTL index, a unique public challenge ID, a unique active target key, a target/history query index, and a unique partial verification-token-hash index. Expiry is checked in every mutation rather than relying on asynchronous TTL deletion.
- Unit/Test may use the deterministic adapter and code `000000`. The native Local preview runs a private SMTP catcher so the complete email path is exercised without contacting a real mailbox. Preview, UAT, and Production require authenticated TLS SMTP; the deterministic adapter is rejected there.
- When the auth runtime is installed, `/ready` includes the provider as the redacted `otp` check. SMTP authentication is verified and cached for five minutes. An unconfigured or unavailable adapter makes readiness return `503` while `/health` remains process liveness.
- Delivery failure invalidates the persisted challenge before returning a redacted provider-unavailable error. No vendor selection, real mailbox, Production data, or provider credential is included.

## Credentials and tokens

- Admin passwords are hashed with Argon2id. Only the dedicated `admin_credentials` collection stores the hash; normal queries and JSON omit it.
- Access tokens use a short-lived signed JWT-compatible `HS256` shape with issuer, audience, user ID, session ID, role, account state, issue/expiry times, and a unique token ID. `AUTH_ACCESS_TOKEN_SECRET` must be a canonical base64url value representing at least 32 random bytes and is never logged or returned.
- Refresh tokens are 32 random bytes encoded with base64url. Only their SHA-256 hashes are stored in `sessions`.
- Successful authentication uses the same access/refresh model for every role. Verified email login and Seeker registration call the same session issuer as Admin login; the opaque refresh token remains cookie-only.

## Rotation and replay policy

A refresh performs a compare-and-set revocation of the current session and links it to its replacement. A concurrent loser or later reuse of a rotated token is treated as compromise and revokes every active refresh session for that user. Expiry and account state are checked during refresh instead of relying on asynchronous MongoDB TTL cleanup. Suspended or rejected accounts cannot refresh.

Logout is deliberately not idempotent at the credential boundary: a missing, invalid, expired, or already-revoked token returns `INVALID_REFRESH_TOKEN`. This avoids treating an unauthenticated request as a successful authenticated mutation.

## Cookie and response policy

The refresh cookie is `HttpOnly`, `SameSite=Strict`, scoped to `/api/v1/auth`, and uses `Secure` in Preview, UAT, and Production. Local and Test omit `Secure` so loopback HTTP can exercise the contract. Authentication responses use `Cache-Control: no-store`; the opaque refresh token never appears in a JSON response or checked-in environment.

Failures use the standard error envelope. Invalid email/password pairs always return `INVALID_CREDENTIALS` without identifying whether the account exists. Validation rejects unknown fields, and unknown runtime failures are redacted by the existing error boundary.

## Synthetic Admin setup boundary

This task does not add a default Admin, plaintext password, Production account, or credential seed. An isolated environment must create an Admin User plus an Argon2id `AdminCredential` through an explicitly authorized provisioning path before live login can succeed.
