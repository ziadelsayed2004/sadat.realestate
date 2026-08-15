# Property query indexes

Property list and public projection queries use bounded page/limit values and deterministic tie-breakers. The runtime property schema now exposes an explicit index catalog for the query patterns that already exist:

- provider lists: provider/status/updated-at plus `_id` ordering;
- administrative/public status lists: status/active/updated-at;
- project and location projections: project or location with status/active;
- nearby searches: a sparse `2dsphere` coordinates index;
- localized search: a weighted text index over Arabic, English, Simplified Chinese names, and slug.

The provider and administrative repositories use MongoDB `$text` for bounded localized search rather than interpolated regular expressions. Query plans carry an explicit index hint and a deterministic skip/limit calculation. `apps/api/tests/performance/property-indexes.test.ts` validates the catalog, pagination bounds, and synthetic explain summaries. `apps/api/tests/performance/search-performance.test.ts` exercises a synthetic 250-row search page, asserts one repository call (no N+1 hydration), caps output at the documented 100-item page contract, and checks every query pattern at the maximum page/limit boundary.

These are the available local performance targets: bounded page/limit, expected index selection, deterministic sort/pagination, one repository read for a public list page, and an allowlisted capped response. The repository has no approved production latency or throughput SLA, so the tests do not invent millisecond targets or claim live MongoDB `explain('executionStats')` results. Live explain checks remain optional and require an isolated replica set.

Live `explain('executionStats')` checks require an isolated MongoDB replica set and are intentionally not run when `TEST_MONGODB_URI` is unavailable. Synthetic plan assertions do not claim production execution statistics.
