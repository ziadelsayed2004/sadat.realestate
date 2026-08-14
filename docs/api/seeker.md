# Seeker registration and self-owned profile

The seeker flow uses the verified, one-time opaque authority returned by
`POST /api/v1/auth/otp/verify` with `purpose: registration`.

- `POST /api/v1/auth/register/seeker` consumes that authority exactly once, creates a verified seeker account from the OTP phone number, and returns the shared access-token session shape. The rotating refresh token is set only as the `HttpOnly` `sadat_refresh` cookie.
- `GET/PATCH /api/v1/me` expose only the authenticated seeker projection. The phone number and role are server-owned; update requests allow only `firstName`, `lastName`, and `locale`.
- `GET/PATCH /api/v1/me/preferences` expose only the authenticated seeker's own search preferences. Updates are allowlisted and merged server-side; `userId` and arbitrary MongoDB fields are rejected.
- The profile locale is the self-owned account setting exposed by `PATCH /api/v1/me`; it is restricted to `ar`, `en`, or `zh-CN` and never changes the authenticated subject or role. Account deletion, anonymization, and privacy-request workflows remain explicitly deferred under Q-012.

All request bodies are strict runtime schemas. Access tokens are required on
the `/me` routes and only a `seeker` token may use them. Internal notes,
assignments, audit data, credentials, OTP material, and private documents are
not part of these projections.

The preference fields are intentionally taxonomy-neutral identifiers and basic
numeric bounds. Product-specific property/location taxonomies remain owned by
later tasks and are not fabricated here.
