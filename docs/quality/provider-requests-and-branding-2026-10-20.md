# Developer manual customer requests, logo and navigation spacing — 20 October 2026

The preceding homepage article-section fix was completed and pushed as `ec02ba46`. This follow-up addresses the developer customer-request screenshot, dashboard spacing and separate company-logo uploads.

## Customer requests

The request service applied incoming-customer privacy restrictions to a manual lead entered by the provider itself. Without commission acknowledgement, even a provider's own entered name/phone disappeared and all transitions were disabled. Manual leads are now treated separately only when all four persisted facts agree: type `provider_customer`, source `provider`, creator equals the authenticated provider, and provider owner equals that same account. The active-account requirement, repository ownership scope, strict request payload, optimistic versioning and transition rules remain enforced.

The owner can read the name, phone, email and inquiry text it supplied, call or email that lead, and update the follow-up status. Customer-name/phone/email search is enabled within a nested owner-and-manual-type condition. Incoming platform requests remain redacted until existing visibility requirements are met; searching cannot reveal their hidden identities. Another account cannot read or change the manual lead. Manual records in a needs-information state no longer invoke the separate sent-contact reply requirement.

The creation form explains that this records a customer who contacted the company offline by phone, WhatsApp or a visit. It creates neither a property advertisement nor an automatic viewing appointment. Provider dashboard content now has 32 px desktop padding, 28 px tablet top padding and 24 px mobile top padding, with a separate gap before the requests heading and safe space around navigation.

## Company cover and logo

Registration and approved-company settings now have distinct cover and logo controls, previews and removal actions. The optional registration field `companyLogoUrl` is persisted, returned to its owner and authorized administrators, validated against the uploading account, and copied to the approved organization's `logoUrl`. Existing `companyImageUrl`/`imageUrl` continue representing the cover. Both use the existing scanned JPEG/PNG/WebP upload pipeline and 10 MB limit. Suggested dimensions: cover 1600 × 900 px; logo 512 × 512 px. Public identity logos use contain fitting.

The organization editor sends only changed image fields and supports explicit null removal. Replacing/removing the logo preserves the cover. Version conflicts and a foreign account's photo are rejected. Public organization-photo downloads recognize either an approved organization's cover or its logo while retaining current directory visibility checks; unattached photos, pending applications and removed logos are not public.

Real-browser validation also found a pre-existing failure: saving a company whose optional description was `{}` made the public profile fail its contract and return “not found.” Empty descriptions are now unset when saving. Defensive public projection omits empty descriptions, preserves valid language values, and keeps the approved company and its branding visible without rewriting legacy production records.

## Validation

- API regressions cover self-entered leads with commission access disabled, incoming privacy, cross-account denials, guarded literal-name search, logo ownership, separate approval publication and empty optional descriptions.
- Frontend regressions cover separate registration fields/removal and full contact/details for the owner's manual lead.
- `node --import tsx scripts/verify-provider-requests-branding-local.mjs` uses real local HTTP, MongoDB, scanned uploads, application submission and administrative approval. It verifies private registration images, approval publication, settings replacement/removal, stale/foreign/corrupt rejection, manual lead creation/contact transition/search, incoming redaction and cross-account isolation. Chromium and WebKit cover Arabic and English at 320/390/1440 px, both upload fields, visible public logos and dashboard spacing without horizontal page overflow. Fixture accounts, requests and stored files are removed afterward. No response interception or production mutations are used.
- Lint, TypeScript, full tests and production build run through the normal guarded push. The separate logo controls and manual-lead interface add approximately 4.2 KiB of JavaScript; four additional KiB plus existing headroom bound that increment. Per-chunk and route-CSS budgets are unchanged.

Browser evidence: [provider-requests-branding-local-latest.json](guide-runs/provider-requests-branding-local-latest.json). Screenshots and local logs are under `.tmp/provider-owner`.

Source/GitHub delivery only. Deployment of the new build is required for the live website; no production account, policy acknowledgement, request or company image is altered by this work.
