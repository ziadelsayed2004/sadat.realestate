# Identity and account model foundation

The identity module registers five connection-scoped Mongoose models: `User`, `SeekerProfile`, `ProviderProfile`, `AdminProfile`, and `Session`. Registration is idempotent and uses the existing application connection rather than the global Mongoose model registry.

## User identity

`User` stores a role type, account state, supported locale, state-change timestamp, and a required normalized email plus an optional legacy/contact phone field:

- Email is trimmed and lowercased.
- Phone uses an E.164-shaped value.
- Each identifier has a partial unique index, so uniqueness applies when that identifier exists.
- A normalized email is required for Seeker and Provider identities. Phone remains an optional legacy/contact field where a separate approved contract allows it; it is not an authentication identifier. OTP is bound only to email, role type, and purpose. Admin users use normalized email plus password.

No password, OTP, raw session token, provider credential, or production account is included in these shared identity records. Admin password hashes are isolated in `admin_credentials`. OTP challenges are isolated in `otp_challenges`, store only keyed code and opaque verification-token hashes, and use explicit active-target, lookup, uniqueness, and TTL indexes.

## Profiles and states

Each profile has a unique immutable `userId`. Provider type supports the three approved product categories: individual broker, office, and development company. Account and provider-review state constants and transition guards mirror the current state-machine document; undefined jumps such as unverified directly to verified or draft directly to approved are rejected by policy.

Cross-document role/profile consistency is enforced by identity application services in later tasks. Admin login, seeker/provider email-bound OTP login, refresh rotation, reuse detection, logout, and one-time registration verification authority are implemented. Account registration, downstream bearer authorization, and public projections remain later scope.

## Sessions and indexes

Sessions store only a token hash, never the opaque token. The token hash is excluded from normal selection and JSON serialization. Explicit indexes provide unique token-hash lookup, per-user session history, and TTL cleanup at `expiresAt`. MongoDB TTL cleanup is asynchronous and is not a substitute for checking expiry during authentication.

Production index creation remains deployment-managed by the existing index policy. Local/test environments may build declared indexes automatically. An isolated MongoDB instance is required to prove server-enforced uniqueness and TTL behavior; schema declarations and validation are covered without external services.
