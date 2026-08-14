# Business Rules

| ID | Rule | Enforcement |
|---|---|---|
| BR-001 | Every published property has a clear source | Model, publish validation, and projections |
| BR-002 | The verified badge represents genuine approval only | Backend-derived flag |
| BR-003 | Comparison contains at most two items | API validation and UI guard |
| BR-004 | Seekers never see internal notes, assignments, or audit data | Projection and negative tests |
| BR-005 | Sensitive reject, needs-information, and suspend actions require a reason | Validation and audit |
| BR-006 | Unauthorized actions are hidden or View Only | RBAC, availableActions, and UI |
| BR-007 | A payment proof is manually reviewed and is not bank verification | State machine and interface copy |
| BR-008 | Advertising has no assumed universal public price | Quote workflow |
| BR-009 | Commission is not a universal hardcode | Policy resolver |
| BR-010 | Public content must be Published | Query scopes |
| BR-011 | Documents and payment proofs never use permanent public URLs | Private storage gateway |
| BR-012 | Arabic RTL and English/Simplified Chinese LTR use the same contracts | Localization contracts |
| BR-013 | No AI, government, bank, or ownership automation without a real approved integration | Product guardrail |
| BR-014 | Production cannot display fabricated operational numbers | Data source and tests |
| BR-015 | A Screen ID is a QA reference, not a mandatory route name | Coverage matrix |
| BR-016 | Provider application requirements are selected only from the approved `individual_broker`, `brokerage_office`, and `developer_company` type-specific configurations | Provider-type enum, versioned requirement configuration, validation, and contract tests |
| BR-017 | Provider documents are explicitly classified as required, optional, or conditional; conditional requirements use machine-readable conditions and optional documents never block submission | Requirement policy and submission validation |
| BR-018 | Application submission stores an immutable snapshot of the applicable document-requirement version | Submission aggregate and repository tests |
| BR-019 | Requirement changes apply to new drafts and explicitly restarted submissions only; submitted applications are not invalidated retroactively | Version selection policy and regression tests |
| BR-020 | Provider documents and applications are reviewed manually; rejected or replacement-required documents include an administrative reason | Review state machine, validation, and audit |
| BR-021 | Provider approval is platform administrative approval and never claims automatic government, ownership, bank, registry, OCR, or legal verification | Projections, interface copy, and negative tests |
| BR-022 | Provider documents remain private and are delivered only through authorized, non-permanent access | Private storage gateway and authorization tests |
| BR-023 | Public and private assets use separate namespaces; Provider documents and payment proofs have no public ACL, permanent public URL, public CDN, static-file exposure, or response-visible storage key | Storage adapter policy, projections, and negative tests |
| BR-024 | The server generates opaque storage keys; user-controlled filenames, paths, IDs, categories, and extensions never form a storage path | Upload service and storage-adapter contract |
| BR-025 | Provider-document extension, declared MIME, and detected magic signature must agree; only approved PDF, JPEG, and PNG files within the 10 MiB limit are accepted | Streaming validator, signature tests, and request limits |
| BR-026 | File-security state is independent from business review state; every upload is quarantined and access remains fail-closed until a configured scanner reports `clean` | Scanner adapter, state policy, and access tests |
| BR-027 | Private delivery requires fresh authentication, permission and ownership or review-scope checks, then issues only an exact-object GET URL valid for 300 seconds; signed URLs are never stored, logged, audited, or listed | Access service, audit projection, and negative tests |
| BR-028 | Binary retention and legal holds follow the approved lifecycle schedule; deletion is idempotent and leaves no valid download path | Retention metadata, cleanup policy, and audit tests |
| BR-029 | Preview/UAT/Production storage and scanners fail closed when unconfigured; Production never falls back to local filesystem storage | Environment validation, readiness, and deployment gates |
| BR-030 | Provider-document replacements are versioned and bounded; identical checksums for the same Provider application and category are idempotent and do not create duplicate active records | Unique/index policy, rate limits, and concurrency tests |
| BR-031 | The first Super Admin is created only through an explicit, one-time, transactional internal bootstrap; it refuses to run after any Admin or bootstrap guard exists and never exposes credentials through HTTP, source, logs, examples, or evidence | Bootstrap command, unique guard, transaction, strict input, and negative/concurrency tests |
