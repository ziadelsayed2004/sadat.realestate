# Approved developer directory and published projects

Date: 2026-10-14

## Problem and resulting behavior

Approved developers could be present in administration while the public directory returned no companies, even without a search filter. Company profiles and their published projects were incorrectly dependent on commission acknowledgement. The visibility reader also excluded valid accounts whose `deletedAt` field was explicitly `null`.

Approved, verified developer accounts now qualify for the developer directory and company/project pages before commission acknowledgement. This supersedes the acknowledgement requirement for directory visibility described in the earlier admin-projects QA report. Direct company phone, WhatsApp and address still require the existing contact entitlement. Other identity scopes, brokerage subscriptions and individual-provider rules retain their existing policy. Suspended, deleted or unapproved developers remain hidden; unpublished and archived projects remain absent from public profiles.

Homepage developer cards and sitemap company links use the same directory policy. Administration help and the generated user guides describe the resulting behavior. Existing automatic organization reconciliation creates a missing company record and links owned projects safely.

## Verification

- API regression suite: 24 tests passed, including name search, profile/contact projection, sitemap, owner identifier variants, null/absent deletion fields, revoked acknowledgement and suspended/deleted/unapproved accounts.
- Targeted web suites: 25 tests passed for admin project actions and the public developer directory.
- Typecheck, lint, generated-guide check and production build passed. Existing asset budgets were retained.
- Real local Mongo/API/browser journey passed without mocked responses. An approved developer with `deletedAt: null`, no commission acknowledgement and no initial organization was reconciled idempotently; its three projects were linked. Name search opened the company and its published project in Arabic and English on mobile. Private contacts stayed absent.
- Admin project pages at 1440px and 390px in both languages had working named links and no horizontal overflow. Actual edit/preview saved a published project, actual archive removed it from public display while retaining the company, and account suspension hid the company. Synthetic fixtures were cleaned up.

Local evidence: `.tmp/developer-directory-real/result.json`, screenshots in the same directory, and `.tmp/developer-directory-*-tests*.log`. Production access during diagnosis was limited to read-only public requests; this report does not claim a production deployment or modification of real accounts.
