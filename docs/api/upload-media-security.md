# Upload and media security verification

The upload/media security boundary is exercised by `apps/api/tests/security/upload-media-security.test.ts` and the existing upload/media suites.

- User filenames are display metadata only. Control characters and path separators are normalized to a basename; storage keys must match opaque namespace-specific patterns and cannot contain traversal segments.
- Provider documents and property media use strict MIME contracts, magic-byte validation, bounded content lengths, encrypted-PDF rejection, and strict unknown-field rejection.
- Private provider-document downloads are HMAC-bound to one document and an expiry timestamp. Wrong-document, expired, malformed, or tampered grants fail closed and do not become bearer access.
- Orphan cleanup evaluates retention windows and legal holds deterministically. Eligible bytes are tombstoned/revoked before deletion, so retries cannot leave an active reference to removed storage.

The focused tests use deterministic in-memory storage and synthetic bytes only. No production object storage, malware vendor, database, or credentials are required for this verification boundary.
