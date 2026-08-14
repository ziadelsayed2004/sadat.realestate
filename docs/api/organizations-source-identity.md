# Organizations and source identity

The `organizations` master-data collection represents approved brokerage offices and developer companies. Every organization has one immutable provider link, a stable slug, localized `ar`/`en`/`zh-CN` content, an explicit review state, and optimistic versioning. Public directory endpoints are intentionally deferred to `backend_064`.

Source identity is always backend-derived. Its `sourceType` remains one of `individual_broker`, `brokerage_office`, or `developer_company`; organization identity must match the provider type. `verified` is true only when the provider is approved and, for a company/office, the linked organization is approved. Draft, rejected, inactive, suspended, or mismatched records cannot produce a verified badge.
