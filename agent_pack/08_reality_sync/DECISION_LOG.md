# Decision Log

No product decision has been confirmed beyond the supplied handoff and the architecture principles already recorded in the Agent Pack.

Q-001 through Q-012 remain explicitly pending in `01_product/OPEN_QUESTIONS.md`. Their listed defaults are planning placeholders only; they must not be used as production behavior, hardcoded prices, provider integrations, or compliance policy.

`backend_000` records repository reality and does not resolve those questions. The task that first needs each decision must either attach an approved owner/date/rationale decision or remain blocked. Architectural decisions require an ADR before implementation.

`backend_004` uses a URI-driven Mongoose boundary and an isolated replica-set test contract without selecting a production host, provider, or topology for Q-010. Its local-only seed registry is intentionally empty until approved synthetic domain fixtures exist.
