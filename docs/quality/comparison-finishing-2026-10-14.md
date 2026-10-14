# Comparison finishing — 2026-10-14

The comparison's Arabic finishing row always returned the unavailable label. It now displays localized names from the property's selected, active finishing features. These are maintained through the existing provider Features and services step and the administrator feature catalog. A hint in the provider form explains this path. No finishing value is inferred from delivery readiness, descriptions or unrelated amenities.

The public comparison adds optional `items[].finishing`; the existing row key `deliveryStatus` remains compatible. The repository uses one bounded lookup of selected IDs in `features_services`, includes only active features in the finishing group or recognized legacy finishing slugs, and returns names without internal IDs. Hydration associates each valid property with its original row by ID.

Validation:

- 9 comparison API tests and 29 comparison/provider advanced-form UI tests passed; workspace typecheck passed.
- Production build and existing bundle budgets passed.
- Real local browser/API/MongoDB journey, without mocked responses: an approved synthetic provider selected and saved a finishing choice, and its ID persisted. After publishing the synthetic fixture for read verification, the comparison displayed its localized name in Arabic at 1440/390px and English at 390px.
- A second published property with delivery readiness, an inactive finishing choice, an ordinary feature and a service did not acquire a finishing value. Public API request order was preserved, internal feature IDs were excluded, and deactivation removed the finishing choice from subsequent public comparisons.
- Synthetic records and sessions were removed. No production data was edited or deployed.

Local evidence: `.tmp/comparison-finishing-real/result.json`, screenshots in that directory, `.tmp/comparison-finishing-api.log`, `.tmp/comparison-finishing-web.log`, `.tmp/comparison-finishing-types.log`, and `.tmp/comparison-finishing-local.log`.
