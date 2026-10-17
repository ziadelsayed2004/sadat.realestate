# Client follow-ups — 17 October 2026

- [x] Property validation names, links and focuses missing fields. Switching an unlinked unit to a standalone property preserves entered data.
- [x] Fresh seeker/developer OTP registrations and password login in independent Chromium/WebKit sessions; desktop logout preserves mobile access. Deleted email/phone reservations are released, new registration creates a new identity/credential, and financial history remains linked to the old ID.
- [x] Arabic/Persian/Latin digits and attached prefixes such as `المنطقة ال٢٢` match existing areas. Catalog failures offer retry instead of raw-ID entry.
- [x] Provider/admin browsing hides save, viewing and company/project inquiry controls and contact anchors. The API rejects provider inquiry targets; general platform support contact remains available.
- [x] Reason-bearing role deletion rejects assigned roles and stale versions. Reassign staff first. Assignment and deletion share a transaction write lock.
- [x] Company editing, scanned photo upload/private preview, reversible directory removal and restoration. Admin: `/admin/providers` → company account. Developer: `/provider/settings`, account tab. Hidden/unapproved owners cannot expose company photos.
- [x] Compact mobile heading/images; real ad images remain visible above search. Real layout checks cover 320, 390, 768 and 1440 pixels.
- [x] Direct-message counts and attention queues are distinct. Review/publication atomically notifies the property owner; retry does not duplicate the notification.
- [x] New/reviewed contacts can be accepted directly with an audit reason. Assignment and notes are optional; active staff names replace raw identifier entry.
- [x] Property review exposes featured selection/order and published active/unexpired featured properties sort first. Categories wrap into rows. Live homepage refresh updates categories while preserving search selections. A live browser verifies the newly added category without opening View all.
- [x] Viewing cards contain images separately from details. A real WebKit viewing request verifies mobile appointment presentation.
- [x] Banner status follows its actual time window and changes at boundaries. Editing an already-started scheduled banner activates it rather than rejecting the edit. The assisted request form asks for phone and description.
- [x] Reading time explicitly says “قراءة”; publication date is separately visible in a semantic `time` element.
- [x] Advertisement/payment submission returns to public search with a dismissible success message and tracking link. Actual scanned proof upload verified.
- [x] Payment review shows the advertiser name/account link. Provider lookups accept account IDs as well as application IDs.
- [x] Provider customer requests explain inquiries, offline manual records, status updates and the separate viewing schedule.

Delivery requires local browser/API checks, quality gates and a normal push to GitHub main. No production deployment.

## Repeatable verification

Local runtime: `npm run local:up` (API 3000, web 4173, replica-set MongoDB 27018, local inbox 8025). Synthetic accounts and uploaded bytes are cleaned up. Run browser phases separately within the normal request budget; the head phase pauses before its live-category check.

```text
node --import tsx scripts/verify-client-followups-local.mjs
node scripts/verify-client-followups-auth-browser-local.mjs
node scripts/verify-client-followups-provider-auth-local.mjs
node scripts/verify-client-followups-browser-local.mjs head
node scripts/verify-client-followups-browser-local.mjs tail
node scripts/verify-client-followups-browser-local.mjs payment
```

Results: [service transactions](guide-runs/client-followups-services-local-latest.json), [seeker login](guide-runs/client-followups-auth-local-latest.json), [developer login](guide-runs/client-followups-provider-auth-local-latest.json), [property/company administration](guide-runs/client-followups-browser-head-local-latest.json), [requests/mobile layout](guide-runs/client-followups-browser-tail-local-latest.json), [payment upload/review](guide-runs/client-followups-browser-payment-local-latest.json). Screenshots remain locally under `.tmp/client-followups-browser-*`.

The verification chain exercised API coverage, 1,089 Vitest checks, workspace/Node checks, production builds, API inventory, OpenAPI/Postman validation and the user-guide check. Additional regression tests cover scheduled-banner editing and seeker-only inquiry targets. The normal push hook runs lint, typecheck and the complete test suite against the committed tree and rejects uncommitted edits.

The initial dependency audit failed. Updated Nodemailer to 10.1.2 and patched brace-expansion, proxy-addr, source-map-js and undici in the lockfile. The follow-up audit reports zero vulnerabilities. Actual email registration was rerun against the updated mailer. References: [Nodemailer release](https://github.com/nodemailer/nodemailer/releases/tag/v10.1.2), [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). Build and route chunk/CSS limits remain enforced; the added account tools have a separate JavaScript chunk.
