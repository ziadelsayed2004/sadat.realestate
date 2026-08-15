# Provider advertising projection

The provider advertising projection is an owner-scoped read boundary for the advertising request workflow. A verified provider receives only requests whose persisted `providerId` equals the authenticated subject. Invalid IDs, missing records, and mismatched source ownership fail closed; no administrative or cross-provider lookup is exposed.

Each projection contains the request state and interval, a bounded transition history, an optional quote with integer minor-unit totals and decision history, private payment-proof status/security metadata, and an optional `Africa/Cairo` schedule projection. Storage keys, download URLs, actor identifiers, credentials, and bank-verification claims are deliberately excluded. Payment-proof states remain `pending_review` or `approved` only when the separate review service has recorded that state; the projection does not infer payment or bank verification.

List results use strict status filters and bounded pagination, then deterministic newest-first ordering. This task provides a source-adapter service boundary; HTTP composition and a persistent cross-module repository remain integration work when the runtime wiring is available.
