# Owner follow-up: desktop zoom, identities, sessions and reset

## Implemented behavior

- Desktop listing cards no longer reserve a legacy 208px media row while the image uses a responsive 3:2 frame. That conflict let the image cover the title and price at intermediate viewport widths. The row now follows the media frame.
- The property detail gallery uses `contain` to show the whole source photograph, including portrait images. Cards still fill their 3:2 frames. Uploaded originals and their dimensions are preserved.
- The website-return action follows the user guide in provider, seeker and admin sidebars. The shared account menu has the same sequence. Staff inherit the administrator navigation.
- Administrative property rows show the actual provider account/business name and the source type, retaining the account link and identifier. The server resolves account/application/profile aliases in bounded queries. The new `providerDisplayName` field is administrative output only; it is absent from provider write schemas and public property responses.
- The developer directory, homepage developer rail and developer sitemap require an approved developer company with an active, paid, currently valid identity subscription. Paid brokerage offices remain outside these directory surfaces. Their subscribed public identity and photo remain on their properties; an existing office identity profile can still be reached directly while subscribed. Contact/customer identity remains subject to its independent commission/privacy policy.
- A published unit whose linked project is not public remains visible on the company profile. When its project is published, the unit stays inside that project with an explicit link/count from the available-units section, avoiding the previous misleading empty-state message.
- Inactive developer profiles no longer receive property-source links to unavailable directory pages. Individual sources cannot gain an organization profile URL from stale/invalid organization data.

## Session verification

No new authentication policy relaxation was required. The isolated native verifier uses real signed tokens that expire after six seconds, HttpOnly cookies, the actual API/web runtime and MongoDB. In Chromium and WebKit, all three roles keep their account across two tabs, multiple token expirations, cookie rotations, an offline interval, reconnection and reload. Explicit logout still invalidates the session. Evidence: [session-continuity-local-latest.json](guide-runs/session-continuity-local-latest.json), six runs, no API mocks. This verifies the current runtime locally; production cookie/domain configuration still needs a deployed-server check.

## Responsive and identity evidence

[owner-zoom-directory-local-latest.json](guide-runs/owner-zoom-directory-local-latest.json) records real scanned portrait uploads, administrative subscription activation/deactivation, name projection, public office attribution, developer listing exclusion/inclusion and browser geometry. Chromium/WebKit cover 390/820/1093/1366/1518/1920 CSS pixels. For a 1366px laptop, the intermediate widths cover browser-zoom equivalents of 125%, 100% and 90%. This uses the resulting CSS viewports rather than visual magnification masquerading as browser zoom. Cards cannot cover their title/price; details retain the full portrait. Sidebars are checked on 390px and 1440px for provider, seeker and admin.

## Production reset preparation

The owner selected **main administrator plus site settings only** as the retained scope. Reset now recognizes the newer subscription, draft, photo, notification-read and view collections. Unknown collections still stop execution before deletion. A read-only preview lists candidate IDs and labels, and generates a hash. The production apply command requires this reviewed hash, checks it again in the database transaction, verifies the backup and retains the confirmed Super Admin, settings/reference records and their private assets. Orphan upload removal preserves all storage keys still referenced by retained database records.

Real isolated-Mongo verification: [production-launch-local-latest.json](guide-runs/production-launch-local-latest.json), fourteen checks, including manual trial content, stale-preview rejection, rollback, preserved credentials/RBAC/settings, removed subscriptions/photos and successful fresh admin login. Filesystem tests check retained configuration assets and reject paths outside the selected root before removal. Native deployment shell tests and API artifact validation also pass.

Operator instructions are in [production-reset-preview-2026-10-26.ar.md](../operations/production-reset-preview-2026-10-26.ar.md). Daily `update` remains separate from reset.

## Outstanding production work

No production records or private files have been deleted from this workspace. Production HTTP requests from this environment timed out, and no SSH identity/agent is configured here. The owner confirmed `info@elsadatrealestate.com` as the administrator to retain. The actual production candidate list, reviewed hash and verified server backup must exist before production deletion. Source upload to GitHub does not itself deploy or reset the live site.
