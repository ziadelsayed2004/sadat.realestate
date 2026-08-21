# Private Payment Proofs

Verified providers may upload a proof only for their own advertising request while it is in `waiting_payment`. The service streams the file into a private quarantine namespace, validates filename, MIME type, signature, and size, and requires a configured malware scanner before returning `pending_review`.

The HTTP boundary is `POST /api/v1/provider/ads/:adRequestId/payment-proof`. It accepts the raw PDF/JPEG/PNG stream with `X-File-Name` metadata, derives the provider and request owner from authenticated claims, and persists only redacted proof metadata plus a protected opaque storage key. A repeated checksum returns the existing proof as an idempotent replay.

The public projection contains metadata and review/security state only. It never exposes a storage key, permanent URL, payment gateway result, or `bankVerified` claim. Re-uploading the same checksum for the same request is idempotent. `pending_review` is a manual review state and is not approval.

An administrator with `admin:payments.review` must provide a bounded reason to approve or reject a pending proof. The service uses optimistic versions, treats a repeated decision as an idempotent replay, rejects conflicting terminal decisions, and persists the audit event before exposing the new state. Audit failure leaves the proof pending.

The review boundary is `POST /api/v1/admin/payment-proofs/:proofId/review` with a strict JSON body containing `action`, `expectedVersion`, and `reason`. Persistent reviews are scoped to the proof identifier and pending version; the response remains the redacted metadata projection and never includes `storageKey` or a permanent delivery URL.

Verified administrators with `admin:payments.review` may list active proofs through `GET /api/v1/admin/payment-proofs?status=pending_review&page=1&limit=20`. The bounded projection exposes the proof identifier, advertising request, provider, filename metadata, scan state, review state, version, and review history needed for manual review. It is paginated and status-filterable, excludes inactive proofs, and never exposes `storageKey`, a permanent URL, or a bank-verification result.
