# Owner requests — 22 October 2026

Ordered scope from the latest message. Production records are references only; verification uses isolated local fixtures.

| # | Request / screenshot | Implementation and verification |
| --- | --- | --- |
| 1 | Property `property-6557bc8ee9aa4bcd97b1c57e220f4c7a`; seeker-actions screenshot | Notice retained. Property-specific platform WhatsApp link underneath, using configured platform number. Verified in Chromium and WebKit. |
| 2 | Admin provider `6ada02d7151bd0cdb6c15737`; failed display subscription screenshot | Approved broker, office and developer activation verified through admin UI; own status/dates shown under provider Settings → Account. Seeker forbidden. Clear approval/date/permission feedback. Verified in Chromium and WebKit. |
| 3 | Provider ad `6ada045d151bd0cdb6c15763`; transfer form screenshot | Pending and approved receipts hide payment form after reload; server blocks a different receipt. Rejected correction with the same file verified. Payment submission stays on request details. Concurrent different-file uploads persist exactly one receipt; verified through real HTTP and MongoDB transactions. |
| 4 | Same ad; placement guide screenshot | Provider detail resolves its live banner ID; explicit hero/featured selection and scroll after homepage data commits. Exact featured card link verified in Chromium and WebKit. |
| 5 | Homepage; residents/community screenshot | Published community posts replace samples. Real submission, moderation, homepage display and exact-post links verified in both browsers; hidden posts disappear. |
| 6 | Admin property review `6ada0905151bd0cdb6c1579d`; mobile actions screenshot | Expanded form saves selection/order and the property appears among the first three homepage results, verified in both browsers. |
| 7 | Admin customer requests; narrow table screenshot | Customer name opens the full mobile detail; saved internal notes appear in activity, and are absent from the provider API response. Verified in both browsers. |
| 8 | Homepage return navigation | Cached return took 28 ms in Chromium and 943 ms in WebKit locally, without another HTML request. Background refresh removed a newly hidden post. |
| 9 | Homepage; oversized navy featured-ad screenshot | A deliberately unavailable image recovers after SSR hydration; mobile media/card dimensions remain bounded, with no horizontal page overflow in either browser. |

Completion requires local API/browser verification, normal repository checks, and a verified GitHub push. Server deployment is a separate operation and must not be inferred from GitHub synchronization.

## Findings and operation

- The old payment form allowed uploads whenever a quote was accepted and no approved receipt existed. It therefore stayed open for receipts awaiting review. Both the UI and payment repository now check for an outstanding receipt. Registration serializes uploads by updating the owning request version within the same transaction; a retry observes the first receipt. Exact-file replays remain idempotent, and rejected receipts can be corrected without requiring a different file.
- A valid approved office subscription activated successfully against the original local runtime before changes. The reported production failure is not reproducible with valid local data; production account state was not changed or inferred. The UI now exposes account approval eligibility, validates Egypt dates, distinguishes permission/conflict/validation/connection errors, and confirms successful persistence. Subscriptions apply to the three provider types. They never grant customer identity or contact access; developer commission acknowledgement remains independent.
- Providers find their own read-only subscription in **Settings → Account → Provider identity display subscription**. Administration activates or renews it from the provider detail page after confirming external payment and setting its period. Seekers cannot call this endpoint or see the control.
- The residents section previously filled itself with fixed sample people, dates and counters. It now uses the latest three published community posts. Residents submit from **Community → Write a post**; administration reviews under **Admin → Community → Posts** and publishes. The registered display name is copied at submission; email, phone and identity documents are never copied. Hiding a post removes it from the homepage. The homepage title opens that exact post.
- To feature a property: **Admin → Properties → Review**. The **Manage featured property on the homepage** form is open by default. Check the featured selection, set its order and save. Only published, active and unexpired properties appear; lower numbers take precedence, and the homepage displays three cards.
- Customer tables become labeled cards on small screens, with the customer name opening details. The detail activity includes status changes and saved internal notes. Internal notes are projected only to authorized administration, with a regression test proving their absence for seekers and providers.
- Returning to the homepage can reuse a bounded in-memory snapshot for two minutes, then refresh public data in the background. The snapshot contains only public homepage JSON and SEO metadata. It never retains account controls, credentials, other documents or private request data. The normal API authorization and expiry rules remain intact.
- Featured ad media has explicit mobile dimensions and a fallback for unavailable images, including failures that occur before React hydration. A live provider ad link selects its banner rather than whichever rotating card happens to be first. Unpublished advertisements remain subject to their schedule and review; the placement guide explains this.

## Validation

`node --import tsx scripts/verify-owner-requests-local.mjs` uses loopback MongoDB on port 27018, real HTTP endpoints, real browser navigation and synthetic fixtures. It restores local settings and removes fixture records/files. The full run passed 17 checks across Chromium and WebKit, with zero JavaScript or unexpected HTTP errors. See `guide-runs/owner-requests-local-latest.json`. API unit tests (729), frontend tests (1120), lint and type checking passed. The GitHub update must also pass the normal pre-push lint, type checking, complete test suite and build gates.
