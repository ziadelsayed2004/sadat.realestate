# Responsive developer and office profiles

The previous profile placed the directory link inside the logo grid, used several conflicting breakpoint overrides, and displayed a full-image button over the cover. The header now has a separate locale-aware directory link, a complete `object-fit: contain` cover, and a spaced identity card with its own logo, name and actions. Mobile actions stack; tablet actions share a row; laptop actions sit beside the identity. Tabs wrap into a two-column grid on narrow phones and keep anchor headings below the sticky navigation.

Obsolete header rules were consolidated rather than adding another set of overrides. Directory cards and the profile's project, property, inquiry and contact sections retain their existing behavior. Covers still use the public organization-photo variant, preserve originals and retain existing publication/access checks.

Missing or broken covers have a labelled building fallback. Missing or broken logos have a matching building identity. The live public API for `office-6ada02d7151bd0cdb6c15735` returned no `imageUrl` or `logoUrl` when checked; styling cannot supply an image that is absent from the account. No live account data was changed.

Validation:

- Existing public developer UI suite: 19 passing tests.
- Expanded `node --import tsx scripts/verify-owner-profile-local.mjs`: native local MongoDB and real photo upload, publication and HTTP access. Chromium and WebKit, Arabic and English, 390px phones, 820px tablets and 1440px laptops; also 320px offices with missing and broken media. Checks full cover rendering, removed full-image link, at least 16px cover/logo separation, 44px action targets, wrapping tabs, anchor visibility, and no horizontal overflow.
- Original photo bytes and public/private media access checks remain covered. Fixture files, documents and subscription are removed after the run.
- Report: `docs/quality/guide-runs/owner-profile-local-latest.json`.
