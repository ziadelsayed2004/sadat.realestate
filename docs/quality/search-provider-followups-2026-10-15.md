# Search and provider follow-ups — 2026-10-15

Scope: the five follow-ups supplied after the completed provider/admin goal. Region typing filters existing locations; creating new locations is outside this request (confirmed by the user).

- [x] Remove the homepage “Looking for” group; retain a compact installment checkbox.
- [x] Remove the public listing kind selector and ignore obsolete kind URLs consistently. API kind filtering remains available to existing API consumers.
- [x] Show property views, including zero, in grid and list results. Accepted visits update the public counter in the same transaction as the deduplication event.
- [x] Explain and focus missing basic property fields; provide a standalone action that preserves entered data when no parent exists.
- [x] Search existing registration locations with keyboard/mouse suggestions and searchable service areas. Require both before continuing; completed location fields do not repeat in documents. Partial drafts remain saveable.

Validation:

- Lint and repository typecheck passed.
- Five focused frontend suites: 125 tests passed. Three API suites: nine tests passed.
- Existing document-location browser regression: Arabic mobile and English desktop passed (two cases).
- `node --import tsx scripts/verify-property-view-counts-local.mjs`: isolated local replica-set checks passed for concurrent deduplication, owner/admin exclusion, transaction rollback/retry, legacy counts and retention. The disposable database was removed.
- Real local API/browser journey, without mocked responses: saved a standalone property after field validation; verified one accepted visit and one duplicate; checked old kind URLs, visible views and installment UI at 390/1440 pixels; saved a developer's selected location/service areas and verified no repeated location step in documents; checked the public card in WebKit. Screenshots reviewed in `.tmp/search-provider-real/`; fixtures removed.
- Build passed. Total client JavaScript: 2,618,654 bytes; bounded four-KiB allowance for searchable registration locations/actionable validation. Per-chunk and route CSS limits unchanged.

Legacy counts use retained visit events when the property has no saved counter. Expired historical visitor events cannot be reconstructed. New accepted visits maintain a durable total without retaining visitor hashes beyond their existing TTL.

Delivery: commit and normal guarded push to `main`; no production deployment. The push hook runs the complete lint/typecheck/test checks before updating the remote.
