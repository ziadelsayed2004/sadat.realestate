# Editing or removing property installment plans

The administration property editor now includes a payment method control, complete fields for every saved installment plan, add/remove plan actions and explicit removal of all installments. Choosing cash only or removing installments takes effect after the existing unified Save changes action. Listing type (sale/rent), ownership and publication remain independent.

The editor preserves other plans and bilingual plan names, removes an optional down payment when cleared, uses the property currency and validates the entire update before any write. Invalid counts/amounts do not save; transient failures retain input and the current version for retry. Explicit removal also sends an empty plan list when legacy plan fields were omitted from the safe API projection.

The existing versioned administrative API already supports payment plan updates. No new endpoints or production data changes were needed. Provider pricing help and the Arabic operating guides explain how to remove installments and distinguish payment method from sale/rent.

Validation:

- 18 editor tests cover Arabic/English cash conversion, preserving sale/publication, multiple plans, validation, new plans, retry without losing edits, final-plan removal and legacy plan removal. The existing 20 provider advanced-form tests passed.
- 24 property service tests passed, including authorized administrative plan editing/removal, validation, stale versions and preserved publication.
- Real local MongoDB/API/browser workflow without mocked responses: Arabic desktop plan editing preserved a second plan; Arabic mobile cash conversion removed stored plans and the installment badge from both public listing and details, while retaining sale and active publication. English mobile editing restored installment availability.
- Explicit removal cleared a legacy plan record even when its incompatible fields were absent from the editor projection. Synthetic property, audit entries and sessions were cleaned up.
- Type checking, lint, guide checks and build passed. The editor is grouped with administrative property media so the main administrative chunk remains below the existing 650 KiB limit. The editor/guide add about 4.6 KB to the 2,570,045-byte baseline; the total JavaScript budget allows an additional bounded 4 KiB above its previous limit. Stylesheet and individual-chunk limits are unchanged.

Evidence: `.tmp/property-installments-real/result.json`, browser screenshots in `.tmp/property-installments-real/`, and targeted `.tmp/property-installments-*` logs. Full pre-push checks run against the committed change. No production deployment was performed.
