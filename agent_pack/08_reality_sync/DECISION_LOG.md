# Decision Log

Q-001 has been approved as recorded below. No other product decision has been confirmed beyond the supplied handoff and the architecture principles already recorded in the Agent Pack.

Q-002 through Q-012 remain explicitly pending in `01_product/OPEN_QUESTIONS.md`. Their listed defaults are planning placeholders only; they must not be used as production behavior, hardcoded prices, provider integrations, or compliance policy.

## Q-001 — Authentication identifiers and methods

- **Date:** 2026-08-12
- **Owner:** Product + Security
- **Status:** Approved
- **Affected tasks:** `backend_011`, `backend_012`, `backend_016`, `frontend_020`
- **Decision:** Seekers and Property Providers authenticate with normalized E.164 phone numbers and OTP; they do not have passwords. Admin users authenticate with normalized email addresses and passwords. OTP is implemented behind an adapter boundary, with deterministic fake adapters in Local and Test. Selecting and configuring the Production OTP vendor is a production-readiness prerequisite and does not block `backend_011` or `backend_012`. The password policy applies only to Admin accounts and follows `02_architecture/SECURITY_BASELINE.md`. Successful authentication creates the same access-token and rotating opaque-refresh session model for every user type. Admin MFA is a separate pre-production security decision/task unless current repository truth already requires it.
- **Rationale:** This separates passwordless public/provider authentication from privileged Admin credentials, preserves deterministic and provider-independent development and testing, and lets the authentication foundation proceed without prematurely selecting a Production OTP vendor. A common session model keeps token rotation, logout, and reuse detection consistent across user types.
- **Alternatives rejected:** Seeker or Property Provider passwords; using email as their primary login identifier; coupling implementation to a specific Production OTP vendor; treating the unresolved Production vendor as a blocker for foundational authentication; adding Admin MFA to Q-001 without a separately approved requirement.

`backend_000` records repository reality and does not resolve those questions. The task that first needs each decision must either attach an approved owner/date/rationale decision or remain blocked. Architectural decisions require an ADR before implementation.

`backend_004` uses a URI-driven Mongoose boundary and an isolated replica-set test contract without selecting a production host, provider, or topology for Q-010. Its local-only seed registry is intentionally empty until approved synthetic domain fixtures exist.
