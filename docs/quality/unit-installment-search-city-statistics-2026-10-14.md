# Unit/installment search and city-statistic navigation — 2026-10-14

Homepage search now offers All / Property / Unit and an Installments available checkbox. The property listing exposes the same record-kind choices separately from admin-managed property types, plus All / Installments available / No installments. These controls combine with existing transaction, price, project and type filters. URL serialization retains explicit false as well as true; reset clears both new filters. The API filters persisted payment plans before pagination and total counting, while retaining published/active/unexpired restrictions. Unknown boolean-like strings and operator-shaped values are rejected. OpenAPI and the public search documentation describe the query flag.

Display settings now explain where the homepage's housing-unit, residential-district, building and annual-growth counts are edited, and link directly to the existing city statistics editor under Content / Population counter. The notice distinguishes those manual counts from the sourced automatic population estimate. Existing settings permissions and CMS publishing permissions remain enforced by their respective routes.

Validation:

- Search API tests: 6 passed. The new regression checks that both row queries and total counts receive the combined unit/installment restriction and rejects invalid boolean inputs.
- Homepage, listing, display settings and population editor tests: 84 passed. Coverage includes form submission, combined filters, false round trips, reset and the localized statistics link.
- Workspace typecheck, OpenAPI validation and production build passed. The new homepage option styling adds 543 bytes to the public route stylesheet; its limit increases by one KiB to 265 KiB. JavaScript and individual chunk limits are unchanged.
- Real browser/API/MongoDB verification, without mocked responses, passed in Arabic at 1440/390px and English at 390px. Synthetic fixtures included installment/cash units, an installment property and excluded draft/inactive units. Homepage submission, listing totals, combining a project filter, reload retention, switching availability and reset all worked.
- Following the display-settings link opened the real city-count editor. Saving a synthetic housing-unit count persisted it and changed the public homepage projection. The previous local count was restored, and synthetic properties and test sessions were removed.
- Desktop/mobile homepage controls, listing filters and settings notices were inspected visually. No production data was changed or deployed.

Evidence: `.tmp/search-unit-real/result.json` and screenshots in that directory, `.tmp/search-unit-api.log`, `.tmp/search-unit-web.log`, `.tmp/search-unit-types.log`, `.tmp/search-unit-openapi.log`, `.tmp/search-unit-local.log`.
