# Product Requirements — Sadat Real Estate Platform

## 1. Vision

Create a trusted platform for discovering and presenting Sadat City real estate and connecting seekers with property providers, supported by controlled review, advertising, commissions, content, and fine-grained administration.

## 2. Users

- Public visitor.
- Property seeker.
- Property provider: `individual_broker`, `brokerage_office`, or `developer_company`.
- Administrative user with configurable roles and permissions.

## 3. Success Outcomes

- Every published property has a clear source and a genuine review state.
- Users can search, filter, and compare two items through indexable pages.
- Visits convert into trackable contact, viewing, or property-search requests.
- Providers complete verified onboarding and manage properties and projects in one place.
- Administrative operations remain auditable and permission-safe.

## 4. Public Site

- Homepage, property listing, property details, and two-item comparison.
- Developer and company directory and profiles.
- Articles, community, and authenticated post creation.
- About Platform and Team pages.
- Only published content and approved organizations and properties are public.

## 5. Authentication and Onboarding

- Login, OTP, and seeker registration.
- Provider-type selection, account and business/company data, private documents, review, submission, and tracking.
- Provider states: Draft, Pending Review, Needs Information, Approved, Rejected, and Suspended.

### 5.1 Provider types and common application fields

- The only approved provider types are `individual_broker`, `brokerage_office`, and `developer_company`. Adding a type requires a later approved product decision.
- Every provider application requires `providerType`, `accountOwnerFullName`, `displayName`, the normalized email bound to the email-only Provider authentication authority, `primaryLocationId`, at least one `serviceAreaId`, `preferredLocale`, a Terms acceptance timestamp, and a Privacy Policy acceptance timestamp. Phone and WhatsApp are optional contact/business fields only when the applicable contract exposes them; neither is an authentication identifier.
- A secondary phone, WhatsApp number, profile image or logo, biography or company summary, website, and social links are optional unless a later approved frame explicitly makes one mandatory.

### 5.2 Provider-type-specific fields and documents

- `individual_broker` has no mandatory business-registration fields. It requires `government_id_front` and `government_id_back`. Optional categories are `broker_license`, `professional_membership`, and `additional_supporting_document`; optional documents never block submission.
- `brokerage_office` requires `legalBusinessName`, `tradeName`, `businessAddress`, `commercialRegistrationNumber`, `taxRegistrationNumber`, `authorizedRepresentativeFullName`, and `authorizedRepresentativeTitle`. It requires `commercial_registration`, `tax_card`, `authorized_representative_id_front`, and `authorized_representative_id_back`. `authorization_letter` is conditionally required when the account owner is not the registered owner or legal representative. Optional categories are `brokerage_license`, `company_profile`, and `additional_supporting_document`.
- `developer_company` requires `legalCompanyName`, `brandName`, `headOfficeAddress`, `commercialRegistrationNumber`, `taxRegistrationNumber`, `authorizedRepresentativeFullName`, and `authorizedRepresentativeTitle`. It requires `commercial_registration`, `tax_card`, `authorized_representative_id_front`, and `authorized_representative_id_back`. `authorization_letter` is conditionally required when the account owner is not the registered legal representative. Optional categories are `company_profile`, `developer_license`, and `additional_supporting_document`; website and social links are also optional.

### 5.3 Versioned requirements, submission, and review

- Document requirements are versioned configuration keyed by provider type. Each requirement has a stable English key, a localized display-label key, and a `required`, `optional`, or `conditional` classification. Every conditional requirement has an explicit machine-readable condition. Arabic display text is never used as a logical database value.
- New drafts use the current requirement version. A submission stores an immutable snapshot of its applicable requirement version. Future changes apply only to new drafts and explicitly restarted submissions; an existing submitted application is never invalidated retroactively.
- Drafts may be saved while incomplete. Submission requires every mandatory field and every currently applicable required document to be uploaded. Documents do not need approval before submission.
- Document review is manual. Applicable review states are `uploaded`, `pending_review`, `needs_replacement`, `approved`, and `rejected`. A rejected or replacement-required document requires an administrative reason.
- Application approval means platform administrative approval only. It is not government, ownership, bank, registry, OCR, legal, or any other automatic verification.
- Provider documents are private and never use permanent public URLs. The approved Q-003 upload, storage, scanning, delivery, and retention contract below governs `backend_015` and later asset tasks.

### 5.4 Private storage and environment policy

- Storage uses a provider-agnostic `StorageAdapter`; malware scanning uses a separate adapter. Local stores files in an isolated filesystem location outside every public/static web root. Test uses isolated temporary or in-memory storage with deterministic fixtures. Preview/UAT uses isolated non-production S3-compatible storage with synthetic data. Production uses private S3-compatible storage with TLS, encryption at rest, least-privilege credentials, lifecycle rules, and configured malware scanning.
- The concrete commercial vendor, endpoint, region, bucket names, credentials, and scanner deployment are environment configuration and Production Readiness prerequisites. Missing Preview/UAT/Production storage or scanner configuration makes upload capability unavailable and readiness fail honestly; Production never falls back to local filesystem storage.
- Public and private assets use separate namespaces, preferably separate buckets. Provider documents and payment proofs have no public ACL, permanent public URL, public CDN, Express static exposure, or direct storage key in normal API responses. A CDN is reserved for explicitly public approved media in later tasks.

### 5.5 Provider-document upload contract and limits

- Uploads are authenticated, ownership-restricted, server-mediated streams into quarantine. The server generates an opaque object key; user filenames, paths, categories, IDs, and extensions never form storage paths. The sanitized display filename is limited to 120 characters with path components and control characters removed.
- Provider documents allow only `.pdf` with `application/pdf` and a valid PDF signature, `.jpg`/`.jpeg` with `image/jpeg` and a valid JPEG signature, or `.png` with `image/png` and a valid PNG signature. Normalized extension, declared MIME, and detected magic signature must agree. Reject zero-byte, malformed, truncated, encrypted or uninspectable PDF, double-extension, SVG, HTML, XML, Office, archive, executable, script, and indeterminate files. Never trust declared MIME alone.
- The limit is 10 MiB per Provider document, one active document per requirement category, and at most 12 active categories per application. Replacement creates a new version, supersedes the prior active version, and is limited to five attempts per category in 24 hours. Authenticated rate limits and request/multipart limits reject excess data before persistent storage where possible.
- Persist actual byte size, detected MIME, SHA-256 checksum, generated storage key, upload actor and timestamp, requirement category, and requirement-version snapshot. Re-uploading the same checksum for the same Provider, application, and category is idempotent and creates no duplicate active record.

### 5.6 Quarantine, review, and private delivery

- Every upload enters quarantine. File-security state is independent from business review state. Security states are `quarantined`, `scan_pending`, `clean`, `infected`, `scan_failed`, and `deleted`; business review states remain `uploaded`, `pending_review`, `needs_replacement`, `approved`, and `rejected`.
- A file is unavailable for review or download until security state is `clean`. `infected`, `scan_failed`, and unavailable scanners fail closed and never imply safety. Local/Test may use deterministic clean, infected, timeout, and failure scanner fakes. Preview/UAT/Production require a configured ClamAV-compatible or equivalent approved scanner. Private documents never go to a public third-party scanner that may retain or learn their contents.
- After fresh authentication, permission and ownership/review-scope checks, and confirmation that the document is clean and not deleted, authorized access may issue an exact-object, GET-only signed download URL valid for 300 seconds with attachment disposition and private/no-store behavior where supported. Providers may access only their own application documents. Administrators require explicit document-review permission and applicable scope. Public and Seeker roles have no access.
- A signed URL is a bearer credential: never persist or log it, place it in analytics/audit/errors, or return it in list endpoints. Audit only actor, document ID, action, purpose, timestamp, and request/trace ID.

### 5.7 Binary retention

- Delete unattached incomplete uploads after 24 hours; infected binaries within 24 hours after safe metadata/audit capture; abandoned-draft binaries 90 days after last application activity; superseded versions after 30 days unless under active review or hold; rejected or withdrawn application binaries 180 days after final decision; and approved application binaries 365 days after account closure, while retaining them while the account remains active.
- A legal or compliance hold suspends deletion only with actor, reason, start date, and audit record. Deletion is idempotent and revokes every download path. Later audit policy may retain minimal non-sensitive tombstone metadata, never bytes, signed URLs, credentials, or unnecessary content. `backend_015` stores required lifecycle fields; scheduled cleanup and cross-module governance may be completed by `backend_124`.

## 6. Seeker

- Overview, requests and request details, viewings, saved properties, notifications, preferences, profile, and settings.
- Internal notes, assignment data, and audit data must never appear in seeker projections.

## 7. Provider

- Dashboard, My Properties, and an eight-step property wizard.
- Projects, customer requests, and viewing appointments.
- Advertising requests and private payment-proof upload when required.
- Read-only commission policy, notifications, and settings.

## 8. Administration

- Users, seekers, providers, document review, account reports, and restrictions.
- Taxonomy, locations, features, projects, properties, reviews, duplicates, and reports.
- Request operations, SLA, and request issues.
- Articles, community, About, Team, population counter, homepage, and CMS.
- Ads, quotes, proofs, calendar, banners, and financial review.
- Commission policies, accounts, exceptions, confirmations, and change history.
- Settings, SEO, privacy, display, administrator users, RBAC, notifications, and audit.
- The first Super Admin is provisioned through an explicit one-time internal bootstrap with normalized email, an Admin-only Argon2id password, an atomic database guard, and no HTTP bootstrap route or checked-in credential. Dynamic roles and complete administrator lifecycle APIs remain permission-enforced administrative capabilities.

## 9. Publication and Comparison Rules

- Every published listing has an explicit Provider or Organization source.
- A verified badge appears only after genuine approval.
- Comparison is limited to two items and covers price, payment plan, area, layout, location, features, media, source, and project/developer.

## 10. Requests and Viewings

- Types: contact, viewing, property search, and provider-added customer request.
- Reference lifecycle: New, Contacted, Follow-up, Viewing, Interested or Negotiation, Completed or Closed, with type-specific allowed transitions.
- Assignment and internal notes are available only to authorized administrative or provider users.

## 11. Advertising and Payments

- Do not assume a universal public price; administrators issue a quote.
- Payment proofs are reviewed manually. Uploaded never means Approved or bank-verified.
- Reference lifecycle: Draft, Review, Waiting Pricing, Quote Sent, Waiting Payment, Scheduled, Active, and Ended.

## 12. Commissions

- A policy can be percentage-based, fixed, or exempt.
- Account overrides and effective-dated exceptions may apply.
- No universal commission value is hardcoded.
- Providers may view the effective policy but cannot modify it.

## 13. Locales and Devices

- Arabic (`ar`) with RTL is the primary visual locale. English (`en`) and Simplified Chinese (`zh-CN`) use LTR with the same routes, components, contracts, and permissions.
- Public and Auth surfaces support desktop, tablet, and mobile.
- Seeker, Provider, and Admin dashboards are desktop-only within the current approved design scope.

## 14. Privacy and Security

- Documents and payment proofs are private and delivered only through authorized, short-lived access.
- Sensitive endpoints require appropriate authentication, RBAC, ownership, validation, and rate limiting.
- Sensitive actions create append-only audit entries with reasons and before/after data where appropriate.
- Prevent IDOR, NoSQL injection, mass assignment, upload abuse, and PII leakage.

## 15. Common Interface States

Every applicable journey includes Loading, Empty, Error, Retry, and Success states, plus missing-image, long-text, expired, or unavailable variants when relevant.

## 16. Out of Scope Unless Approved

- AI matching or fabricated automated scoring.
- Automated government, bank, or ownership verification.
- An unspecified payment gateway.
- Responsive dashboard behavior beyond approved frames.
- Fixed operational numbers without a documented data source.

## 17. Definition of Done

- API contracts are documented and tested; permissions and availableActions are correct.
- Approved frames, locales, direction, and states are complete.
- Positive, negative, authorization, validation, and transition tests pass.
- No secrets, production mocks, or unsupported claims remain.
