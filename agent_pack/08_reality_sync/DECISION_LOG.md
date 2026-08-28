# Decision Log

## DECISION-2026-08-28-WAVE-1-FINAL-RECONCILIATION

- **Status:** Active coordinator hold; Wave 1 reconciliation blocked
- **Scope:** Public 12, Auth 19, and Seeker 10 only; Arabic RTL and English LTR verification only
- **Decision:** Keep all 41 Wave 1 screens evidence-complete but open: Public `PARTIAL`, Auth coordinator `PARTIAL`, and Seeker `PARTIAL_EXTERNAL`. Keep the queue paused before `PRV-01`; do not create or start Provider/Admin work.
- **Current gates:** Public responsive visual 17/48 passed with 31 screenshot failures; Auth responsive visual 24/30 passed with 6 screenshot failures; no current snapshots updated. Public 43/43, About/Team 6/6, Community 7/7, Auth unit 17/17, Seeker 46/46, focused API 106/106, Public accessibility 54/54, About/Team accessibility 12/12, browser security 18/18, Community visual 12/12, About/Team visual 12/12, and Seeker dashboard QA 50/50 passed. Typecheck, lint, API inventory, OpenAPI, Postman, build/bundle, and `git diff --check` passed. Performance failed 4/4 at 11397087 script bytes against a 6000000-byte browser budget.
- **Remaining blockers:** Public retains repository-owned geometry, typography, image-framing, and component-parity defects; Auth retains AUTH-01/AUTH-02 visual gaps and the current responsive screenshot failures; all ten Seeker records retain individualized external prerequisites with zero repository-owned defects. No screen is closed.
- **Preservation:** No reset, revert, stash, clean, discard, overwrite, commit, branch, worktree, Provider, or Admin operation was used. The 13 zh-CN snapshot changes remain preserved and queued separately. The coordinator-started dev server was stopped after verification. No production OTP migration or live SMTP email was attempted.
- **Next action:** Keep `WAVE1-REPAIR-2026-08-28` open, resolve the bounded Public/Auth/performance defects and obtain the Seeker prerequisites, then rerun combined closure checks. A Provider task is not dependency-ready and was not created.

## DECISION-2026-08-28-WAVE-1-REPAIR-RECONCILIATION

- **Status:** Active coordinator hold; bounded repair completed, Wave 1 closure blocked
- **Scope:** Public 12, Auth 19, and Seeker 10 only; Arabic RTL and English LTR verification only
- **Decision:** Keep all 41 Wave 1 screens evidence-complete but open: Public `PARTIAL`, Auth coordinator `PARTIAL`, and Seeker `PARTIAL_EXTERNAL`. Keep the queue paused before `PRV-01`; do not create or start Provider/Admin work.
- **Gate results:** Public visual 16/16, Auth visual 10/10, Public focused Vitest 43/43, Auth focused Vitest 24/24, Seeker focused Vitest 46/46, Public accessibility 18/18, performance 4/4, bundle budgets, typecheck, lint, API inventory, OpenAPI, Postman, browser security, and `git diff --check` pass. Public/Auth baselines were changed only after direct review and each had a no-update follow-up pass; the update ledger records 18 exact files and hashes.
- **Remaining blockers:** Direct Public/Auth clone/runtime reconciliation remains partial; all ten Seeker records retain individualized external prerequisites; the separate stale About-Team accessibility check has 2 failures against pre-existing dirty-tree markup. No screen is closed.
- **Preservation:** No reset, revert, stash, clean, discard, overwrite, commit, branch, or worktree operation was used. zh-CN snapshots, lane evidence, failure artifacts, environment files, and intentional deletions remain preserved. No production OTP migration or live SMTP email was attempted.

## DECISION-2026-08-28-WAVE-1-RECONCILIATION

- **Status:** Active coordinator hold
- **Scope:** Public 12, Auth 19, and Seeker 10 only; Arabic RTL and English LTR verification only
- **Decision:** Retain all 41 Wave 1 screens as open evidence-complete records, with Public `PARTIAL`, Auth coordinator `PARTIAL`, and Seeker `PARTIAL_EXTERNAL`. Keep the execution queue paused before Provider (`PRV-01`) and do not begin Provider or Admin implementation.
- **Evidence:** `08_reality_sync/WAVE_1_RECONCILIATION_2026-08-28.json`, `docs/quality/figma_parity/HARD_CHECKPOINT_2026-08-28.json`, and the synchronized queue/ledger/checkpoint files.
- **Rationale:** The implementation gates now pass, but direct Public/Auth clone/runtime reconciliation remains partial and Seeker still lacks approved external identity/media/metadata inputs. No Wave 1 screen is closed.
- **Next action:** Keep Wave 1 paused under the bounded coordinator repair/reconciliation task `WAVE1-REPAIR-2026-08-28`; obtain the missing approved inputs and rerun combined closure checks. A Provider task may be created only after Wave 1 closure is actually eligible.
- **Locale rule:** Do not test, capture, update, or classify the 13 preserved zh-CN snapshots in this run. They remain a separate cleanup queue.

## DECISION-2026-08-27-EMAIL-ONLY-AUTH

- **Status:** Active and superseding for implementation
- **Scope:** Seeker and Provider identity, registration, login, OTP, grants, repositories, projections, fixtures, and UI
- **Decision:** Use normalized email as the only Seeker/Provider identity identifier. OTP request and verification accept only `email`, `roleType`, and `purpose` (plus challenge/code on verify). `/auth/verify-email` is canonical; `/auth/verify-phone` is a browser-only legacy redirect and does not accept phone OTP. Admin remains email/password. Phone and WhatsApp may remain only as approved contact/business fields.
- **Rationale:** This is the newer explicit product instruction and removes phone from identity and OTP without removing legitimate property/provider contact data.
- **Compatibility:** The former phone-plus-email Q-001 decision below remains unchanged as historical provenance. Existing phone-bound pending OTP challenges must be invalidated by `auth_email_only_otp_identity`; accounts without email are reported and are not given a synthetic identity.

## DECISION-2026-08-27-MAP-URL

- **Status:** Active
- **Scope:** Property location contract, persistence, projections, Provider wizard, and Public property details
- **Decision:** Accept only absolute HTTPS `mapUrl` values up to 2048 characters. Keep `locationId` and coordinates for compatibility; at least one source is sufficient. Do not fetch, geocode, or synthesize URLs. Public opens the stored URL in a new tab with `noopener noreferrer`.

## DECISION-2026-08-27-SCREEN-BASELINE-AND-WAVES

- **Status:** Active
- **Decision:** The official baseline is 131 screens: Public 12, Auth 19, Seeker 10, Provider 24, Admin 66. Supplementary is historical Auth provenance only. Coordinator Bootstrap precedes parallel Public/Auth/Seeker; Provider follows reconciliation; Admin runs alone last. No historical screenshot or percentage closes a screen without fresh before/after review.

Q-001 through Q-003 have been approved as recorded below. No other product decision has been confirmed beyond the supplied handoff and the architecture principles already recorded in the Agent Pack.

Q-004 through Q-012 remain explicitly pending in `01_product/OPEN_QUESTIONS.md`. Their listed defaults are planning placeholders only; they must not be used as production behavior, hardcoded prices, provider integrations, or compliance policy.

## DESIGN-EXCEPTION-ADM-54 - Owner-approved visual-source waiver

- **Status:** Approved non-blocking release exception
- **Approved by:** Project Owner
- **Screen:** `ADM-54` - Request Settings
- **Reason:** The exact approved local export is unavailable, and the mapped external Figma/Drive source remained inaccessible after documented recovery and access attempts.
- **Original provenance retained:** Drive group `https://drive.google.com/drive/folders/1qunt0uMMz1Q3EyNrLY1DJgmexvnOp_24`; Figma prototype page `6017:4356`, node `6017:61879`.
- **Allowed substitute evidence:** Approved Admin design tokens and brand system, approved sibling Admin settings frames, shared Admin shell patterns, current runtime visual baselines, AR/EN/zh-CN locale and direction checks, the approved Admin Desktop matrix, functional tests, route tests, RBAC/permission tests, and accessibility tests.
- **Forbidden claim:** Direct ADM-54 pixel-perfect comparison was not performed and must never be reported as passed.
- **Release effect:** `frontend_074`, `frontend_077`, `frontend_081`, `frontend_089`, and `frontend_090` may close when every other mandatory criterion passes and this exception is referenced in their completion evidence.
- **Residual debt:** Replace this waiver with direct source comparison if an approved ADM-54 export becomes available later.

## DESIGN-DECISION-ADM-54-AUTHOR-001 - Owner authorization for a new local design

- **Status:** Owner-authored source and structured runtime comparison approved
- **Approved by:** Project Owner
- **Approved on:** 2026-08-25
- **Screen:** `ADM-54` - Request Settings
- **Decision record:** `OWNER_DECISION_ADM_54: I approve docs/design_sources/final_screens/admin/ADM-54.owner-authored.png and ADM-54.owner-authored.html as the new authoritative ADM-54 Request Settings design source. The historical frame is confirmed absent from Figma, and no historical pixel-parity claim is made.`
- **Decision:** Use the reviewed owner-authored HTML and PNG as the authoritative local ADM-54 source instead of recovering or fabricating the unavailable historical Figma frame.
- **Design basis:** Existing Sadat Design System, Admin shell and navigation, adjacent `ADM-53` and `ADM-55` references, implemented Request Settings API, and current PRD.
- **Primary scope:** Arabic RTL and Admin Desktop. English and Simplified Chinese LTR remain supported by the runtime.
- **Required source:** `docs/design_sources/final_screens/admin/ADM-54.owner-authored.html` and its deterministic PNG review export.
- **Functional constraint:** The design and runtime may expose only values returned by the implemented Request Settings API; no unsupported operational rules or fabricated production values may be added.
- **Historical provenance retained:** The original Drive group and Figma prototype references remain recorded in the design-source manifest. This local source is not a recovered historical Figma artifact.
- **Verified source hashes:** HTML `db4b978a09f1d0487f2bcd253c9de61ee587b0cf4bf690fe4b7aaf3d491c12d0`; PNG `7d9ee8a2cc7552c6a02031af888c1981c50928bcfc25591c121d33950674a364`.
- **Completion gate:** The source-review decision, deterministic runtime comparison, focused locale, permission, state, accessibility, and build verification passed. `frontend_096` may close with the documented shell-width and tab-wrapping differences retained as structured debt. Direct comparison against the unavailable historical frame must not be claimed.

## Q-001 — Authentication identifiers and methods

- **Date:** 2026-08-12
- **Owner:** Product + Security
- **Status:** Approved
- **Affected tasks:** `backend_011`, `backend_012`, `backend_016`, `frontend_020`
- **Decision:** Seekers and Property Providers authenticate with normalized E.164 phone numbers and OTP; they do not have passwords. Admin users authenticate with normalized email addresses and passwords. OTP is implemented behind an adapter boundary, with deterministic fake adapters in Local and Test. Selecting and configuring the Production OTP vendor is a production-readiness prerequisite and does not block `backend_011` or `backend_012`. The password policy applies only to Admin accounts and follows `02_architecture/SECURITY_BASELINE.md`. Successful authentication creates the same access-token and rotating opaque-refresh session model for every user type. Admin MFA is a separate pre-production security decision/task unless current repository truth already requires it.
- **Rationale:** This separates passwordless public/provider authentication from privileged Admin credentials, preserves deterministic and provider-independent development and testing, and lets the authentication foundation proceed without prematurely selecting a Production OTP vendor. A common session model keeps token rotation, logout, and reuse detection consistent across user types.
- **Alternatives rejected:** Seeker or Property Provider passwords; using email as their primary login identifier; coupling implementation to a specific Production OTP vendor; treating the unresolved Production vendor as a blocker for foundational authentication; adding Admin MFA to Q-001 without a separately approved requirement.

## Q-002 — Provider onboarding fields and document requirements

- **Date:** 2026-08-13
- **Owner:** Product + Compliance
- **Status:** Approved
- **Affected tasks:** `backend_014`, `backend_015`, `frontend_022`, `frontend_023`, `frontend_024`, `frontend_025`
- **Decision:** Support exactly `individual_broker`, `brokerage_office`, and `developer_company`. Every application captures the approved common identity, contact, location, locale, Terms, and Privacy fields. Office and developer applications additionally capture their approved legal, tax, address, and representative fields; individual brokers have no mandatory business-registration fields. Document requirements are versioned by provider type and classified as required, optional, or conditional, with stable English keys, localized label keys, and explicit machine-readable conditions. Individual brokers require front and back government ID; offices and developers require commercial registration, tax card, and front and back authorized-representative ID. An authorization letter is conditional when the account owner lacks the applicable registered-owner or legal-representative authority. The full optional category lists and common optional fields are recorded in `01_product/PRD.md`.
- **Submission and review policy:** Incomplete drafts may be saved. Submission requires all mandatory fields and currently applicable required documents to be uploaded, then stores an immutable snapshot of the applicable requirement version. Later configuration changes affect new drafts and explicitly restarted submissions only; they do not retroactively invalidate submitted applications. Documents may be submitted before approval and are reviewed manually using `uploaded`, `pending_review`, `needs_replacement`, `approved`, or `rejected`. Replacement and rejection require an administrative reason. Platform approval is not government, ownership, bank, registry, OCR, or legal verification.
- **Rationale:** Versioned, provider-specific requirements allow Product and Compliance to evolve onboarding without corrupting historical review context, while draft tolerance and submission-time validation support resumable onboarding. Stable logical keys keep localization separate from stored policy, and manual review avoids unsupported verification claims.
- **Alternatives rejected:** A single universal field/document list; adding unapproved provider types; hardcoding Arabic display text as logical values; making optional documents submission blockers; requiring document approval before submission; applying new requirements retroactively to submitted applications; claiming automated or external legal/government verification.
- **Q-003 boundary:** Q-002 does not define storage implementation. Q-003 now supplies the approved private-storage, upload-security, scanning, delivery, limits, and retention contract used by `backend_015` and later asset tasks.

## Q-003 — Private storage, upload security, scanning, delivery, and retention

- **Date:** 2026-08-13
- **Owner:** Platform + Security
- **Status:** Approved
- **Affected tasks:** `backend_015`, `backend_047`, `backend_103`, `backend_124`, `backend_130`, `frontend_024`, `frontend_044`, `frontend_049`
- **Decision:** Use provider-agnostic `StorageAdapter` and malware-scanner boundaries. Local storage is an isolated filesystem outside public/static roots; Test uses isolated temporary/in-memory deterministic fixtures; Preview/UAT uses isolated private S3-compatible storage and an approved sandbox scanner; Production uses private encrypted S3-compatible storage, least-privilege credentials, lifecycle rules, and a configured ClamAV-compatible or equivalent approved scanner. Missing higher-environment configuration disables upload capability and fails readiness honestly, with no Production local-storage or scanner bypass.
- **Private separation and upload policy:** Provider documents and payment proofs have no public ACL, permanent URL, public CDN, Express static exposure, or response-visible storage key. Authenticated owner-scoped uploads stream into quarantine where possible. The server generates opaque keys and never derives a path from user input; only a path-free, control-free display filename of at most 120 characters may be retained. Provider documents accept only matching extension, declared MIME, and detected signatures for PDF, JPEG, or PNG, up to 10 MiB. Reject zero-byte, malformed, truncated, encrypted/uninspectable PDF, double-extension, SVG/HTML/XML, Office, archive, executable/script, and indeterminate content.
- **Limits and persistence:** Allow one active document per requirement category and at most 12 active categories per application. A replacement versions and supersedes the previous document and is limited to five attempts per category per 24 hours. Authenticated rate/body/multipart limits apply. Persist actual size, detected MIME, SHA-256, generated key, actor/time, category, and requirement-version snapshot. The same checksum for the same Provider/application/category is idempotent and creates no duplicate active record.
- **Scanning and states:** Keep security state (`quarantined`, `scan_pending`, `clean`, `infected`, `scan_failed`, `deleted`) independent from business review state (`uploaded`, `pending_review`, `needs_replacement`, `approved`, `rejected`). Every upload starts quarantined. Review/download requires `clean`; infected, scan failure, timeout, or unavailable scanning fails closed. Local/Test fakes cover clean, infected, timeout, and failure. Private content never goes to a public scanning service that may retain or learn it.
- **Authorized delivery:** After fresh authentication, permission, ownership/assignment/review-scope, non-deleted, and clean-state checks, issue only an exact-object GET signed URL valid for 300 seconds with attachment and private/no-store behavior where supported. Providers access only their own application documents; administrators need explicit document-review permission and applicable scope; Public and Seeker roles have no access. Signed URLs are bearer credentials and are never persisted, logged, analyzed, audited, errored, or listed. Audit the decision without the URL using actor, document ID, action, purpose, timestamp, and request/trace ID.
- **Encryption, retention, and holds:** Require TLS and Preview/UAT/Production encryption at rest. Delete unattached incomplete uploads after 24 hours, infected binaries within 24 hours after safe evidence, abandoned-draft binaries after 90 days, superseded versions after 30 days unless reviewed/held, rejected/withdrawn binaries after 180 days, and approved-application binaries 365 days after account closure while retaining them during an active account. Reason-bearing, actor-attributed legal/compliance holds may suspend deletion. Deletion is idempotent, revokes download paths, and may retain only later-approved minimal non-sensitive tombstones. `backend_015` stores lifecycle fields; `backend_124` may implement scheduled cleanup and shared governance.
- **Security rationale:** Adapter isolation permits deterministic development and testing without weakening Production controls. Generated keys, signature validation, quarantine, independent security state, least privilege, short-lived authorization, and explicit retention reduce path traversal, content spoofing, malware, IDOR, credential leakage, accidental publication, and indefinite-retention risks.
- **Alternatives rejected:** Public object ACLs or permanent URLs; public CDN delivery for private files; trusting client MIME or filenames; user-derived keys; whole-file buffering when streaming is available; accepting active/office/archive formats; collapsing scan and review states; marking unavailable scans clean; uploading private content to a retaining public scanner; returning keys or signed URLs in lists/logs/audits; Production local fallback; unlimited replacements or retention; blocking adapter implementation until a commercial vendor is selected.
- **Production Readiness boundary:** The commercial S3-compatible vendor, endpoint, region, bucket names, credentials, scanner endpoint/credentials, and live readiness evidence remain deployment configuration. They are absent from repository truth and do not block `backend_015`; Preview/UAT/Production must fail capability/readiness closed until real approved configuration exists. No Production readiness claim is allowed before that evidence.

`backend_000` records repository reality and does not resolve those questions. A task that first needs a pending decision must apply the blocker-classification policy: approved adapter boundaries may proceed with missing Production configuration recorded as a readiness gap, while unresolved domain, authorization, security, financial, legal, or irreversible data-model invariants block when no safe reversible boundary exists. Architectural decisions require an ADR before implementation.

`backend_004` uses a URI-driven Mongoose boundary and an isolated replica-set test contract without selecting a production host, provider, or topology for Q-010. Its local-only seed registry is intentionally empty until approved synthetic domain fixtures exist.

## WAVE-1-FINAL-VISUAL-CLOSURE-2026-08-29

- **Status:** Reconciled; Provider dependency-ready, Provider and Admin unopened.
- **Decision:** The single bounded visual pass directly reviewed the failing Public responsive and Auth actuals against cached canonical evidence. One consolidated Public repair pass corrected the responsive About background cascade and the responsive property-category rail sizing. Public and Auth AR/EN snapshot updates were limited to the exact reviewed files, followed by no-update verification. Chinese snapshots were not tested or updated.
- **Result:** Public 32/32 targeted failed responsive cases passed without update mode; Auth 6/6 targeted failed screenshot cases passed without update mode. Public and Auth have zero remaining repository-owned element-level defects. Seeker remains PARTIAL_EXTERNAL for ten screens with zero repository-owned defects and ten recorded external prerequisites.
- **Evidence:** `agent_pack/08_reality_sync/WAVE_1_FINAL_VISUAL_CLOSURE_2026-08-29.json` records screen classifications, canonical evidence, exact old/new snapshot hashes, commands, results, and the final cursor.
- **Agent Pack:** `frontend_100` is complete with sync exit 0 and audit exit 0 with zero errors. The historical `frontend_099` Partial record is preserved; the dependency-ready visual queue cursor is `PRV-01`. No Provider implementation or Admin work was started.
