# Private provider documents

`backend_015` implements the approved Q-003 boundary for provider-onboarding documents. It does not make Preview/UAT/Production storage ready and does not claim government, legal, OCR, ownership, bank, or malware verification before a clean scan result.

## Runtime surface

- `POST /api/v1/provider/application/documents` accepts one authenticated provider-owned raw binary stream. `Content-Type`, `X-Document-Category`, and `X-File-Name` carry strict request metadata. Supported bodies are PDF, JPEG, and PNG, up to 10 MiB.
- `POST /api/v1/provider/application/documents/:documentId/access` performs a fresh provider ownership and clean-state check and returns a GET-only exact-document bearer URL that expires after 300 seconds.
- `DELETE /api/v1/provider/application/documents/:documentId` deletes an owned document only while its application is editable. The operation marks the record deleted before idempotently deleting the binary, so no later access grant can be honored.
- `GET /api/v1/private/provider-documents/:documentId` redeems the ephemeral signed grant. It returns an attachment with `Cache-Control: private, no-store, max-age=0`. The grant is never returned by list or application endpoints.

The runtime mounts `/api/v1` once. OpenAPI uses `{documentId}` while the Express runtime inventory uses `:documentId`; artifact validation normalizes only this path-parameter notation.

## Validation and persistence

The server strips path components and control characters from the display filename, caps it at 120 characters, rejects double-extension bypasses, and never derives a storage key from user input. It streams through a 10 MiB guard while calculating the actual size and SHA-256 checksum. The normalized extension, declared MIME, and detected signature must agree. PDF header/trailer and encrypted marker checks, JPEG start/end checks, and PNG signature/IEND checks reject zero-byte, malformed, truncated, encrypted, mismatched, and unsupported inputs.

The strict `provider_documents` model stores ownership, application/category, requirement-version snapshot, safe display metadata, actual type/size/checksum, a private generated key, upload actor/time, version/replacement links, independent security and business-review states, retention scheduling, deletion state, and reason-bearing legal-hold metadata. The key is excluded from normal queries and API projections.

One active record is allowed per application/category. Replacements supersede the previous version, schedule its default 30-day deletion, and are limited to five attempts per category in 24 hours. At most 12 active categories are permitted. A same-checksum upload for the same provider/application/category returns the existing active record as an idempotent replay. Unique active-category enforcement and conflict classification cover concurrent uploads.

Only active, `clean` documents are visible to the provider submission inventory. Business review remains manual and independent from security scanning. `needs_replacement` and `rejected` review states require an administrative reason.

## Adapters and readiness

- Local uses an isolated filesystem root under the operating-system temporary area by default, outside every web/static root. `PRIVATE_STORAGE_LOCAL_ROOT` may select another private root.
- Test uses an isolated in-memory adapter and deterministic scanner outcomes.
- Preview/UAT/Production use unavailable fail-closed adapters in this task until an approved S3-compatible storage deployment and approved scanner are configured and integrated. They never fall back to Local storage.

`GET /ready` includes `privateDocuments` when the upload runtime is installed. Both storage and scanner adapters must report ready. Concrete commercial endpoint, region, bucket, credential, encryption, lifecycle, and scanner deployment configuration remains a Production Readiness prerequisite.

## Security notes

The upload endpoint authenticates before applying its provider-keyed rate limit. Private keys and signed URLs are never logged or added to audit payloads. Each successful access-grant decision appends a unified audit record containing actor ID, document ID, action, purpose, time, request ID, and trace ID only; audit persistence failure prevents issuing the grant. Download grants are process-secret HMAC values scoped to one document and expiry; restarting a Local/Test process invalidates outstanding grants safely.

Production credentials, real documents, and signed URL values do not belong in source control, OpenAPI examples, Postman variables, test fixtures, logs, or completion evidence.
