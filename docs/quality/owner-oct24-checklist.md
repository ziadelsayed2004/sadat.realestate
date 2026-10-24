# Owner fixes — 24 October 2026

Status: functional verification passed locally. Production has not been modified. GitHub publication is guarded by the mandatory pre-push checks.

- [x] Explain actual property runtime defaults before work.
- [x] Scope cleanup to seeded and manually entered trial content, after reviewing a record list.
- [x] Unfeature stays removed from homepage; property remains in directory; review controls are clear.
- [x] Homepage view-all actions use gold buttons.
- [x] Homepage articles come from the latest three published articles with active categories.
- [x] Banner draft preview at phone and laptop sizes, with original-intro option persisted through publication.
- [x] Multiple scheduled homepage banners coexist and rotate correctly.
- [x] Application/ad request confirmation cards dismiss manually or after ten seconds.
- [x] Provider settings have configured administration WhatsApp contact.
- [x] Subscription activation, renewal, scheduled activation and expiry notifications are delivered once per version.
- [x] Eligible subscribers can edit public name/photo; expiry hides subscriber identity without granting customer data.
- [x] Property/display settings show effective defaults and explain each supported field.
- [x] Trial cleanup manifest lists exact records; reviewed selections only; backup and stale-plan guards; administrators/settings preserved.
- [x] Recheck sticky site header, static developer tabs, full-width profile and responsive spacing on mobile/tablet/laptop.
- [x] API and Chromium/WebKit verification; deployment/cleanup instructions prepared.

Publication rule: the mandatory Git pre-push hook must pass lint, type checking, full tests and the test prerequisite build. Final remote HEAD is checked after the push.

Deployment to the user's server and production data deletion are separate user-operated steps.

Evidence:

- `guide-runs/homepage-featured-local-latest.json`: selection/removal, legacy removal, directory retention, reselection and expiry in Chromium/WebKit.
- `guide-runs/owner-oct24-browser-local-latest.json`: actual banner preview/save/upload/publish, original/ad rotation, article link, gold links, timed/manual confirmations, provider image/name editing and expiry. Chromium waits for the running API notification worker, rather than directly delivering its expiry notification.
- `guide-runs/owner-oct24-guarantees-local-latest.json`: three provider types, subscription transitions/deduplication/atomic rollback, articles, simultaneous banners, reviewed cleanup, backup restore and dependent-record guards in an isolated real MongoDB database.
- `guide-runs/public-sticky-header-local-latest.json`: 18 route/device/engine checks.
- `guide-runs/owner-profile-local-latest.json`: 21 cover, profile, privacy and responsive checks.
- All 918 API tests passed with 83.15% line, 79.55% branch and 81.68% function coverage. Focused UI settings/banner tests passed 82 tests; homepage/banner tests passed 80, including exact ten-second confirmation timing.
- OpenAPI, Postman, API blueprint/policy inventory and user-guide checks passed.

Owner instructions: `docs/deployment/OWNER_OCT24_HANDOFF_AR.md`.
