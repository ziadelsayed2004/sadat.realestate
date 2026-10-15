# Advertising, onboarding and content follow-ups — 2026-10-15

- [x] Native date/time pickers throughout the site, including banner scheduling.
- [x] Clear office-location and service-area labels.
- [x] Brokerage-only optional business/tax fields and documents; front/back ID required; distinct optional badges.
- [x] Developer directory images, public profile properties and honest counts/links.
- [x] Subscription cycle and management entry points for every provider type.
- [x] Remove the unwanted skip-to-content control from site shells.
- [x] Simplify provider/admin advertising workflows and scheduling conflicts.
- [x] Featured-ad actions/editing, installment switch and separated language fields.
- [x] Compact homepage hero and installment control in the search filter row.
- [x] Responsive city-statistic numbers without overflow.
- [x] Population/statistics editor with live preview and saving several values together.
- [x] Readable advertising calendar with human labels and edit links.

- [x] Mobile login and independent device sessions; normalize copied email safely.
- [x] Reject registering an existing email across account types, including an already authenticated browser.
- [x] Actionable banner schedule conflicts with a link to the placement's existing banners for editing.
- [x] Project publication, company visibility and a clear explanation of the project/unit relationship.
- [x] Mobile banner above a separate search panel, with the advertisement unobscured.

Implemented and verified locally:

- Scheduling uses native date/time controls and the Egypt timezone. Banner conflicts retain the draft, explain the corrective action and link to the relevant banner list. Hero/featured rotation remains supported.
- Editable brokerage drafts use a new office-only document policy: both ID sides required, business/tax documents and numbers optional. Company requirements and submitted historical snapshots retain their original policy.
- Developer cards use ready uploaded property covers where no company image exists, provide a named visual fallback, and count/link published, active, unexpired properties under account/profile ownership aliases. Projects retain publication and company-approval visibility rules.
- Provider subscription guidance covers individual accounts, externally paid office identity-display periods, developer commission acknowledgement, and separate paid advertising. Management links open the appropriate controls.
- Featured setup opens editable display settings; imports open editable drafts. The installment switch and language tabs preserve separate localized creative. Preview, editing, publication, ordering, exact-card links and stopping passed real API/browser journeys at desktop/mobile widths.
- Mobile hero media is displayed in full above the search panel. WebKit checks at 320/390/768/1440 found no page overflow. Live city-statistic previews handle eight-digit numbers; multi-save retries retain unsaved changes and do not repeat successful writes.
- Calendar cards use readable placements, Egypt dates/durations and action links; filters explicitly apply to the current page, with pagination available.
- Real Chromium/WebKit sessions proved simultaneous desktop/mobile login and mobile survival after desktop logout. Invisible copied email direction controls are normalized; visible invalid characters and passwords remain strict. Existing email registration is rejected before OTP delivery across roles and still protected by the unique database index.

Evidence: focused API tests (authentication, office requirements/submission and organization covers), frontend tests (advertising, banners, featured cards, population and partial-save recovery), real local journeys recorded under `.tmp/followupqa-result.json`, `.tmp/featured-actions-real/result.json` and `.tmp/session-repeated-real/result.json`. Accessibility shell checks passed in desktop English/mobile Arabic (6 cases); provider type/keyboard/password/visual checks passed in those projects (8 cases). Local preview screenshots: `.tmp/followupqa-home-390.png`, `.tmp/followupqa-home-1440.png`, `.tmp/followupqa-statistics.png`.

Delivery gate: normal guarded push to main runs lint, typecheck and the complete test suite against the committed, clean working tree. No production deployment.
