# Authentication and session contracts

`backend_011` implements Admin password login and the shared session lifecycle. `backend_012` adds provider-independent phone OTP authentication for Seekers and Property Providers. The Production OTP vendor remains a release-readiness prerequisite; no vendor behavior or credentials are assumed by this implementation.

## Implemented routes

| Route | Authority | Behavior |
|---|---|---|
| `POST /api/v1/auth/login` | Public, rate limited | Accepts only normalized Admin email and password; returns a signed access token and sets an opaque refresh cookie. |
| `POST /api/v1/auth/otp/send` | Public, globally and per-target rate limited | Creates a five-minute seeker/provider phone challenge and asks the configured adapter to deliver it. Returns `202` without the code. |
| `POST /api/v1/auth/otp/verify` | Public, rate limited | Consumes a valid challenge once. Login returns the shared session and refresh cookie; registration returns a ten-minute, single-use verification authority. |
| `POST /api/v1/auth/refresh` | `sadat_refresh` cookie | Rotates the opaque token exactly once, revokes the predecessor, and detects reuse. |
| `POST /api/v1/auth/logout` | `sadat_refresh` cookie | Revokes the current session and clears the cookie. |

Account creation, password reset, session listing, and per-session management remain planned. OTP registration verification does not create an account; `backend_013` owns Seeker registration and later provider onboarding owns Provider account creation.

## Phone and request contracts

The send and verify requests accept only `roleType: seeker | provider` and `purpose: login | registration`. Admin OTP is rejected. Phone input permits presentation separators and a `00` international prefix, then becomes one canonical E.164 value such as `+201000000000`; national-format input without a country code is rejected because no default country is inferred.

Send returns `accepted`, a public UUID challenge ID, and expiry/resend durations. Verify requires the same phone, role, purpose, challenge ID, and exactly six digits. A login result has `outcome: authenticated` plus the same access-token/user DTO used by Admin login; the opaque refresh token is cookie-only. A registration result has `outcome: verified` plus an opaque verification token and duration. Only the verification token hash is retained, and its repository redemption is compare-and-set so a later registration can consume it once.

Strict runtime schemas reject unknown fields, `admin` roles, unsupported purposes, malformed UUIDs, local phone guesses, and malformed codes. `INVALID_OTP` deliberately covers missing, expired, mismatched, already-used, and nonexistent-account login challenges. Other public codes are `OTP_ATTEMPTS_EXCEEDED`, `OTP_SEND_RATE_LIMITED`, `OTP_PROVIDER_UNAVAILABLE`, and `ACCOUNT_NOT_ACTIVE`; none includes phone, code, provider internals, or stack traces.

## Challenge and provider policy

- The code is keyed with a domain-separated HMAC before persistence. A raw code is present only at the delivery boundary and never in a response, log, model JSON, or checked-in environment.
- Challenges expire after five minutes, allow five verification attempts, and impose a 60-second resend cooldown per normalized phone, role, and purpose. Replacement, failure, verification, and consumption remove the unique active-key authority.
- MongoDB declares a TTL index, a unique public challenge ID, a unique active target key, a target/history query index, and a unique partial verification-token-hash index. Expiry is checked in every mutation rather than relying on asynchronous TTL deletion.
- Local and Test use a deterministic fake adapter and code `000000` for repeatable synthetic tests. Preview, UAT, and Production fail closed with `OTP_PROVIDER_UNAVAILABLE` until an explicit sandbox/live adapter is injected. The deterministic adapter is never selected there.
- When the auth runtime is installed, `/ready` includes the provider as the redacted `otp` check. An unconfigured or unavailable required adapter makes readiness return `503` while `/health` remains process liveness.
- Delivery failure invalidates the persisted challenge before returning a redacted provider-unavailable error. No vendor selection, real phone, Production data, or provider credential is included.

## Credentials and tokens

- Admin passwords are hashed with Argon2id. Only the dedicated `admin_credentials` collection stores the hash; normal queries and JSON omit it.
- Access tokens use a short-lived signed JWT-compatible `HS256` shape with issuer, audience, user ID, session ID, role, account state, issue/expiry times, and a unique token ID. `AUTH_ACCESS_TOKEN_SECRET` must be a canonical base64url value representing at least 32 random bytes and is never logged or returned.
- Refresh tokens are 32 random bytes encoded with base64url. Only their SHA-256 hashes are stored in `sessions`.
- Successful authentication uses the same access/refresh model for every role. Verified phone login calls the same session issuer as Admin login; account registration does not issue a session in this task.

## Rotation and replay policy

A refresh performs a compare-and-set revocation of the current session and links it to its replacement. A concurrent loser or later reuse of a rotated token is treated as compromise and revokes every active refresh session for that user. Expiry and account state are checked during refresh instead of relying on asynchronous MongoDB TTL cleanup. Suspended or rejected accounts cannot refresh.

Logout is deliberately not idempotent at the credential boundary: a missing, invalid, expired, or already-revoked token returns `INVALID_REFRESH_TOKEN`. This avoids treating an unauthenticated request as a successful authenticated mutation.

## Cookie and response policy

The refresh cookie is `HttpOnly`, `SameSite=Strict`, scoped to `/api/v1/auth`, and uses `Secure` in Preview, UAT, and Production. Local and Test omit `Secure` so loopback HTTP can exercise the contract. Authentication responses use `Cache-Control: no-store`; the opaque refresh token never appears in a JSON response or checked-in environment.

Failures use the standard error envelope. Invalid email/password pairs always return `INVALID_CREDENTIALS` without identifying whether the account exists. Validation rejects unknown fields, and unknown runtime failures are redacted by the existing error boundary.

## Synthetic Admin setup boundary

This task does not add a default Admin, plaintext password, Production account, or credential seed. An isolated environment must create an Admin User plus an Argon2id `AdminCredential` through an explicitly authorized provisioning path before live login can succeed.
