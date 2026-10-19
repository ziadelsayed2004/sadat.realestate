# Client follow-ups — 19 October 2026

- [x] Area search accepts Arabic/Persian/Latin numbers, offers clickable results and retains the full selection list after an unmatched search. Existing catalog IDs remain authoritative.
- [x] Opening a published property's editor creates a private working copy. Saving fields, uploading/reordering/removing photos and leaving the editor keep the public property and media unchanged. The provider's status page reads the published copy and can resume the draft. Only explicit submission atomically replaces the working content and withdraws the listing for administration review. Approval republishes it. The interface explains this before editing and submission.
- [x] Community pages acknowledge only the successfully displayed records, in a bounded batch. Receipts are scoped to the administrator and record revision; unseen records, other administrators and subsequent updates remain unread.
- [x] Open/in-review community reports have an accessible red indicator beside the report. Resolving a report removes its indicator and refreshes navigation counts.
- [x] Homepage text is centered over the cover with a contrast gradient; search overlaps the lower edge. SVG carousel arrows follow RTL/LTR and work in Safari, including images already loaded before hydration. Hidden-image decoding no longer blocks navigation.
- [x] Legacy custom roles with advertising pricing, scheduling or payment-review capabilities receive the necessary request-reading prerequisite on the server. No unrelated write capability is added. The permission chooser includes the same prerequisite.

Validation uses real local MongoDB transactions and real HTTP/browser journeys, without intercepted responses:

- `node --import tsx scripts/verify-oct19-property-edits-local.mjs`: isolated database, owner isolation, published/working projections, draft fields/media, replacement upload and ordering, stale versions, atomic submission, audit-failure rollback, republication and per-admin read receipts. The isolated database is removed afterward.
- `node --import tsx scripts/verify-oct19-browser-local.mjs`: a non-super-admin role deliberately saved without `admin:ads.view` accepts/prices an advertisement in Chromium, reviews payment and schedules through guarded APIs; role management stays forbidden. Community reading/resolution and Arabic area selection are exercised in the UI. WebKit checks cover/text geometry, search overlap and both arrow directions at 320, 390, 768 and 1440 pixels. Synthetic records are cleaned up.
- Regression coverage includes explicit server-side prerequisite tests and the report indicator disappearing after resolution. Lint, TypeScript, production bundle budgets and the complete test suite are required by the guarded GitHub push.

Machine-readable results: [property/edit/attention journeys](guide-runs/oct19-property-edits-local-latest.json) and [browser journeys](guide-runs/oct19-browser-local-latest.json). Local viewport captures are in `.tmp/oct19-browser`.

The four-KiB JavaScript budget increment covers the bounded receipt API, area results and draft guidance; existing individual-chunk and route-CSS caps remain unchanged. The private `property_edit_drafts` and `property_media_drafts` collections preserve existing property/media IDs. Optimistic version checks protect against concurrent administrative changes.

This delivery changes source and GitHub only. No production records or the client's actual role were modified by these tests; production needs to run the updated build.
