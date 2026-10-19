# Client follow-ups: notices, provider login, category slider and photo guidance

The office registration/resume failure was reproduced through the real local UI. Its API returned a valid draft with `requirementVersion: 2026-10-15.office.1`, but the shared response contract accepted only date/numeric versions. This broke parsing both the application version and its requirements snapshot. The bounded version format now accepts the office namespace and older numeric versions. Draft accounts remain able to sign in and resume; approval requirements are unchanged.

Public read-only API inspection also confirmed that the client's new `soso` entry is a parent `category`, while the homepage selected only child `type` entries. The homepage now includes active parent categories and types, totals the parent's child listings, and sends parent selections to `propertyCategoryId`. Existing type selections still use `propertyTypeId`. The `/properties` listing implementation and layout were not changed.

The homepage category section uses one horizontal scrolling row with touch/keyboard access and RTL/LTR arrow controls. It no longer wraps cards into a grid or overlaps the featured section. The shared toast component separates heading, body, optional action and dismiss control, wraps long text, and gives the dismiss button its own space. Homepage success and administrative provider-review feedback use it.

The provider media step contains an expandable, initially open photo guide with three local SVG illustrations: level landscape photography, a corner/doorway viewpoint, and daylight positioning. Bilingual guidance also covers room coverage, tidying and cover selection. The guide remains separate from the existing uploader.

Validation:

- Contract regression accepts both office and older versions and rejects malformed values. The homepage repository regression covers a new parent and its child count.
- 57 focused frontend tests passed, including category/type destinations, separated success actions, dismissal, and the media uploader alongside the illustrated guide. Fifteen focused API tests passed.
- Real email OTP registration followed by independent Chromium and WebKit password login, draft dashboard, resume and reload passed for brokerage offices, developers and individual brokers. Synthetic records were removed. Reproduce with `node scripts/verify-oct19-provider-login-local.mjs brokerage_office` (or `developer_company` / `individual_broker`).
- `node --import tsx scripts/verify-oct19-followups-local.mjs` passed against real local HTTP/MongoDB with no intercepted responses. It checks newly inserted taxonomy on the homepage before opening any listing; one-row slider geometry and buttons; correct category search submission; non-overlapping toast content and dismissal; and three successfully loaded guide illustrations with the uploader. Browser coverage includes Chromium/WebKit, Arabic/English, and 320/390/1440-pixel viewports. Synthetic records are removed afterward.
- Lint, TypeScript and production bundle checks passed during implementation. The normal guarded push requires the complete regression suite and production build. The new controls and guide add about 4.4 KiB of JavaScript; the total budget has a bounded eight-KiB increment while chunk and route-CSS limits stay unchanged.

Reports: [UI journeys](guide-runs/oct19-followups-local-latest.json), [office login](guide-runs/oct19-provider-login-brokerage_office.json), [developer login](guide-runs/oct19-provider-login-developer_company.json), [broker login](guide-runs/oct19-provider-login-individual_broker.json). Local screenshots are in `.tmp/oct19-followups`. Allow a minute between repeated registration/browser runs: the real server's existing 100-request-per-minute protection remains enabled. An initial rapid sequence hit that limit; the isolated broker rerun passed after its window reset.

These are source changes and local tests. They do not modify production accounts or deploy the application. The production site needs to run the updated build to receive the fixes.
