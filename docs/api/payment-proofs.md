# Private Payment Proofs

Verified providers may upload a proof only for their own advertising request while it is in `waiting_payment`. The service streams the file into a private quarantine namespace, validates filename, MIME type, signature, and size, and requires a configured malware scanner before returning `pending_review`.

The public projection contains metadata and review/security state only. It never exposes a storage key, permanent URL, payment gateway result, or `bankVerified` claim. Re-uploading the same checksum for the same request is idempotent. `pending_review` is a manual review state and is not approval.

An administrator with `admin:payments.review` must provide a bounded reason to approve or reject a pending proof. The service uses optimistic versions, treats a repeated decision as an idempotent replay, rejects conflicting terminal decisions, and persists the audit event before exposing the new state. Audit failure leaves the proof pending.
