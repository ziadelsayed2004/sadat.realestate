# Sticky public header and full-width organization profiles

The shared public site header now stays at the viewport top. Its measured height is published on every public page root, rather than only the homepage. The phone drawer and backdrop start below that actual height.

Organization profiles put their hero and section navigation outside the bounded main-content container. The cover, identity background and section navigation span the viewport on phones, tablets and laptops, while their controls retain readable inner gutters. The cover still displays the complete image. The section tabs are ordinary document content and scroll away; only the site header remains sticky. Section anchors account for the measured site header plus a small gap.

The profile also removes a fixed 60px gap before properties, removes an empty overview-details container, wraps the properties heading and action on narrow screens, and gives empty project messages a compact card. No publication state or account data is changed by these layout fixes.

Validation:

- Public homepage and developer unit suites: 56 passing tests.
- `node scripts/verify-public-header-local.mjs`: 18 real local browser cases across Chromium/WebKit, 390/820/1440px and home/developers/articles routes. Checks header position after scrolling, paint order, measured height, phone menu placement and no horizontal overflow.
- Expanded `node --import tsx scripts/verify-owner-profile-local.mjs`: real local MongoDB and photo uploads; Arabic/English profiles at 390/820/1440px in both engines, plus missing/broken office media and 320px long names with missing overview/projects. Checks full-width header elements, non-sticky tabs, visible anchor targets, cover/logo separation, touch target sizes, compact empty content and no overlapping heading/action. All synthetic fixtures are cleaned up.
- The anchor-navigation E2E helper now checks the actual sticky site header instead of the former sticky tabs.
- Reports: `docs/quality/guide-runs/public-sticky-header-local-latest.json` and `docs/quality/guide-runs/owner-profile-local-latest.json`.
