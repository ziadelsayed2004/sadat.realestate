# Provider onboarding contracts

`backend_014` implements the authenticated Provider application lifecycle approved by Q-002. The only canonical provider types are `individual_broker`, `brokerage_office`, and `developer_company`.

## Implemented routes

| Route | Authority | Behavior |
|---|---|---|
| `POST /api/v1/provider/application` | Single-use Provider OTP registration grant | Creates the verified-phone Provider identity, profile, owned draft application, and shared access/rotating-refresh session. |
| `GET /api/v1/provider/application` | Provider access token | Returns only the caller's application projection. |
| `PATCH /api/v1/provider/application/account` | Provider access token | Saves common contact, location, locale, and policy-acceptance fields with an expected application version. |
| `PATCH /api/v1/provider/application/business` | Provider access token | Saves Brokerage Office fields; other provider types are rejected. |
| `PATCH /api/v1/provider/application/company` | Provider access token | Saves Developer Company fields; other provider types are rejected. |
| `POST /api/v1/provider/application/submit` | Provider access token | Validates all applicable fields and document inventory, freezes the requirement snapshot, and moves the application to `pending_review`. |
| `GET /api/v1/provider/application/status` | Provider access token | Returns the state, available actions, version, and administrative reason when applicable. |

All Provider access-token operations derive ownership from the signed subject. They accept no user or application owner ID, preventing cross-account selection. Mutations require a nonnegative `version`; stale or concurrent writes return `VERSION_CONFLICT` without overwriting a winner.

## Draft and submission rules

Drafts may be incomplete and may be edited in `draft` or `needs_information`. A rejected application may be explicitly restarted by saving a valid step, which moves it to `draft`. Submitted or approved applications are not editable through these routes.

Every draft pins a versioned document-requirement configuration. Each stable English document key has a localization key and is classified as `required`, `optional`, or `conditional`. The `authorization_letter` condition is represented as the machine-readable answer `accountOwnerHasRegisteredAuthority equals false`; Arabic labels are never persisted as logical values.

Submission validates the common and provider-type-specific fields, evaluates the draft's pinned requirement version, and requires every applicable mandatory document to exist in the private document inventory. `uploaded`, `pending_review`, and `approved` satisfy upload presence; `needs_replacement` and `rejected` do not. Optional documents never block submission. The resulting requirement snapshot is immutable, so later configuration changes do not retroactively invalidate a submitted application.

## Review and document boundary

Document and application review are manual administrative processes. Approval means platform administrative approval only and makes no government, registry, ownership, legal, bank, or OCR-verification claim. Administrative rejection or replacement states require a reason.

This task deliberately exposes no document upload, delete, download, or public-URL route. Q-003 and `backend_015` govern private storage, MIME and size restrictions, abuse controls, retention, and time-limited authorized delivery. Until that boundary is implemented, submission can succeed only when an injected private document inventory reports all applicable required uploads.

Responses use the standard strict success/error envelopes and `Cache-Control: no-store`. Provider sessions use the same access-token and rotating opaque-refresh model as other user types; the refresh token remains cookie-only.
