# Advertising Placements and Settings

Advertising placements use stable logical keys, localized labels, bounded media dimensions, surface scope, locale allowlists, activation, and deterministic ordering. Administrative settings require a verified administrator, strict allowlists, a reason, and optimistic versioning. Placement configuration contains no universal advertising price; payable amounts are created later through the quote workflow.

Quotes are issued only by a verified administrator for a request waiting for pricing. Each quote carries integer minor-unit line items, an ISO-4217 currency code, a future expiry, bounded terms, and append-only decision history. A verified owning provider may accept an issued quote once; administrators may reject or cancel it with a reason. Quote acceptance advances the request to `waiting_payment`; this records provider intent only and does not claim bank or payment verification.

Scheduling is administrator-controlled. A request can become `scheduled` only when its interval has not ended and no other scheduled or active request overlaps the same placement. `active` is allowed only during the stored interval, and `ended` only after it. Calendar projections include both the original instants and deterministic `Africa/Cairo` local start/end values; they do not infer a payment, price, or publication result.

## Banners and public publication

Banner records are strict, versioned administrative data. A banner references one active placement, localized title/alt text, an explicit HTTPS target when the placement requires it, a deterministic sort order, and an explicit public media record. Media metadata is limited to HTTPS image URLs and declared dimensions; it never contains private storage keys or credentials. Media cannot be deleted while referenced by a banner.

Banner status transitions are guarded (`draft` → `scheduled` → `active` → `ended` → `archived`, with archival allowed from non-terminal states). Scheduling validates the interval and placement. Activation additionally requires an active placement, enabled advertising settings, a linked media record, the target URL requirement, the active time window, capacity, and no overlapping scheduled/active banner in the same placement. Every mutation uses an expected version and a reason.

Administrative preview and list operations may return draft or inactive records. Public projections are separate: they include only `active` banners whose interval contains the request time, whose placement and advertising settings are active for the requested surface, whose locale is allowed, and whose media is active. Public ordering is placement order, banner sort order, then stable ID. Localized title and alt text are resolved with deterministic `ar` → `en` → `zh-CN` fallback while the keyed localized objects remain available.
