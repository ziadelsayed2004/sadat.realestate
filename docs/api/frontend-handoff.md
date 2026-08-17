# v1 contract freeze and frontend handoff

`apps/api/src/modules/handoff/contract-freeze.ts` is the executable source for the backend handoff. `buildDefaultContractFreeze()` reads the canonical `agent_pack/01_product/SCREEN_REGISTRY.json`, the checked-in OpenAPI document, and the runtime route inventory, then produces a `backend-contract-freeze-v1`-compatible report with:

- SHA-256 hashes of the OpenAPI document and implemented runtime inventory;
- operation IDs and methods/paths for implemented HTTP routes only;
- a generated TypeScript operation-id map under `generatedClient.typeSource`;
- exactly 131 screen rows and their currently mapped operation IDs;
- explicit `partial` or `unmapped` coverage and unresolved readiness notes.

The handoff is backend truth, not a claim that the React/web runtime is complete. Screens without an implemented endpoint must keep a safe empty, unavailable, or draft state. Advertising and commission capabilities are service-level contracts in the current runtime and are not represented as invented HTTP paths. Frontend work remains dependency-gated behind `backend_138`.

The focused contract-freeze tests verify deterministic hashes, strict schemas, operation-id safety, duplicate screen rejection, 131-row coverage, and the absence of credential-shaped content. No secret, token, production URL, or real account is included in the generated client metadata.

The Article Listing and Article Details screens now map to implemented `listPublicArticleCategories`, `listPublicArticles`, and `getPublicArticle` operations. The frontend may obtain category-filter metadata from the dedicated public route and may use the embedded safe category projection in article responses as a resilient rendering fallback. Administrator article/category screen rows map only to the implemented article operations; no planned community route is presented as active.
