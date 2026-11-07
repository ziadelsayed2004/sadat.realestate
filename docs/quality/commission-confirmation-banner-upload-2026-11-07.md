# Commission acknowledgements and request-linked banner upload

Commission confirmation repairs:

- Refresh an expired provider session once on an explicit 401, reading the renewed token for the next request. Do not replay other rejected confirmations or transport failures.
- Identify acknowledgements by account, source, source record and source version. Switching between policies/overrides/exceptions with the same version number no longer conflicts with an unrelated agreement. Preserve previous acknowledgements as superseded; repeated acknowledgement of the same agreement remains idempotent.
- Preserve `exceptionId` in persisted projections so an exception acknowledgement cannot invalidate subsequent provider confirmations and the administrator confirmation list.
- On repository initialization, create the source-aware unique index before removing only the named obsolete account/version unique index. Missing legacy indexes are tolerated; other index errors stop the operation and allow a later initialization retry. No confirmation records are deleted.
- Errors use alert semantics and an error color rather than a green success panel.

A successful acknowledgement is visible at `/admin/commissions/confirmations?lang=ar` to administrators with `admin:commissions.view`. This is an acknowledgement record, not a commission-change request. The existing flow does not issue a separate administrator bell notification; this change does not add one.

Banner repair: preview URLs retain their File identity instead of indexing the latest files array. Saving an uploaded file removes it from that array before the URL effect runs; previously this could call the WeakMap-based slide-key function with undefined and crash the route. Removing/replacing individual files now preserves the correct slide text and releases temporary URLs.

Validation covers repository projection/index order, same-version agreement changes, administrator-visible retained history, expired-session renewal and non-replay of other failures, removing/replacing preview files, and request-linked image upload/save in Arabic/English on desktop/mobile. Generated browser evidence remains ignored. Deployment uses the regular update command; no production business records or commission values were changed from this workspace.

Focused results: 85 interface tests, 30 API tests and eight browser workflows passed. Production build/bundle limits and lint passed; type checking covers the changed API and browser sources.
