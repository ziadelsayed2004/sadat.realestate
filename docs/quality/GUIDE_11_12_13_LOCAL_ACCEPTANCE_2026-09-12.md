# GUIDE-11/12/13 local functional acceptance — 2026-09-12

## Reviewed scope

These journeys cover provider registration, draft completion and document submission, then administrative review through `pending_review`, `needs_information`, resubmission, and approval. The evidence uses the real local browser, HTTP API, MailHog, filesystem upload adapter, and MongoDB replica set without mocked routes.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Registration and authority | `guide-runs/provider-registration-local-latest.json` | Provider type, password, email OTP, draft creation, and current provider session passed. A draft provider received 403 from the admin projection. |
| Draft completion and documents | Same lifecycle report | Account and company fields were persisted, an incomplete submit returned 409, four required documents were uploaded, and a duplicate document upload returned the existing record as an idempotent replay. Public document projections exposed no private `storageKey`. |
| Review lifecycle | Same lifecycle report | Submit reached `pending_review`; a limited administrator received 403; requesting information required and stored a reason; a repeated stale review returned 409; the provider saw the reason, revised, and resubmitted; Super Admin approval synchronized account, profile, and application state. |
| Session and audit state | Same lifecycle report | Each administrative decision revoked existing provider sessions. Reauthentication returned the authoritative `needs_information` and then `verified` state. MongoDB contained ordered `provider.needs_information` and `provider.verify` audits with reasons and matching account-state transitions. |
| Responsive and locale coverage | Same lifecycle report | All draft screens plus pending, needs-information, and approved states passed in Arabic and English on Desktop, Tablet, and Mobile. Each document response was 200, page errors were zero, and `scrollWidth` did not exceed `innerWidth`. |
| Atomic registration guarantees | `guide-runs/provider-registration-guarantees-local-latest.json` | A successful registration created grant/user/profile/application/credential/session coherently. Grant replay and duplicate email were rejected. Forced credential failure rolled back grant consumption and every provider registration record with zero residue. |
| Cleanup | Both reports | The isolated guarantee database was dropped. The real lifecycle deleted its unique user, profile, application, credential, sessions, OTP, documents, review transitions, audits, and only its validated private upload object keys. Demo fixtures were preserved. |

## Applicability

Provider draft routes derive ownership from the current provider session and accept no foreign owner identifier, so a horizontal-IDOR case is not applicable to those self-scoped routes. Administrative review uses a provider application identifier and is protected by current-session checks plus the dedicated review permission; limited-admin denial is exercised directly.

## Remaining global work

GUIDE-11, GUIDE-12, and GUIDE-13 remain `PARTIAL` globally until their independent Figma acceptance, the final project-wide quality gate, and Production verification are complete. Production remains deferred while the project stays in Demo mode.

No Production launch or Demo purge was executed.
