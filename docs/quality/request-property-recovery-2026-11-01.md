# Session, property review and public request recovery

The native API was using the default socket address behind loopback Nginx. This
put visitors in one 100-request/minute bucket. The native entrypoint now trusts
only loopback proxies, and SSR forwards the validated visitor address received
from Nginx's `X-Real-IP`. Remote clients cannot supply a trusted address. Image
reads have a separate bounded bucket, and review thumbnails load near the
viewport instead of flooding the API with every image immediately.

The shared client retries safe reads after transient failures with bounded
attempts/deadlines and honors `Retry-After`. Writes are not automatically replayed
after an uncertain transport failure. Admin property/account operations and image
previews renew an expired access token once after an explicit 401. An already
loaded review preview does not reload when another request rotates the token.

Property edits retain unsaved inputs after failures. A real version conflict
offers the latest title/price and an explicit reload that merges untouched server
fields while retaining locally changed fields. It never silently overwrites the
newer record. Completed media operations leave the queue immediately, and cover
ordering uses a fresh version after media changes.

Standalone property reviews show the provider account name and administration
link even without a public organization. The listing uses the homepage's same
price sliders/inputs, applies exact amounts, preserves other query filters, and
works in Arabic/English at 360, 440 and 1440 CSS pixels. Featured advertiser logos
remain complete (`contain`) inside a circular frame, separate from the banner.

Admin control: **Provider accounts → select an account → company/profile editor →
Image display**. Companies and offices expose cover fitting; individual owners
expose their public name/photo. Office/owner identity controls do not add a
developer-directory action. The existing authorization and edit-reason checks
remain in place.

The live `new-rental-laws-guide` slug returned `ARTICLE_NOT_FOUND` during diagnosis.
It belongs to the removed demo seed; it was not restored as business content.
Temporary article failures retry, while absent/unpublished articles keep an
honest not-found response. No live account, property or article data was edited.

Validation covers trusted proxy attribution and independent bounded media limits;
safe-read retry, write timeout/no replay, session renewal, version-conflict merging,
media retry queues, provider cover fitting, SSR attribution without IP hydration,
article error distinction and browser interaction in both supported directions.
The focused production-browser run passes 16 desktop scenarios, including keyboard/drag
price handles, mobile/wide listing filters, expired-session saves and article
recovery. Eight mobile scenarios cover the advertiser logo, configured promotion
link, listing prices and article recovery in both languages. The promotion test
clicks visible card background instead of a top edge covered by the fixed header.
The proxy/media suite passes seven tests and the contract/SSR run passes
28 tests. The production build passes its JavaScript and route CSS budgets.
The browser fixtures were updated to use the current configured banner target
and always-visible project card instead of obsolete client-inferred targets and
`details` markup. Generated captures remain ignored under `apps/web/test-results`.

The aggregate JavaScript allowance increases by four KiB for this request recovery
and conflict UI; individual chunk and route stylesheet limits are unchanged.
The release still requires the normal lint, typecheck, full API/web test and
production bundle gates. Production activation requires the regular native update;
pushing the commit does not itself restart the live server.
