# Public property comparison

`POST /api/v1/public/properties/compare` compares one or two public property IDs.

The request body is strict and accepts only a unique `propertyIds` array containing one or two MongoDB ObjectId strings. Every requested property must be both `published` and `active`; draft, inactive, missing, or otherwise malformed records fail closed with `PROPERTY_UNAVAILABLE`.

The response preserves request order and exposes the fixed field list in `PUBLIC_PROPERTY_COMPARISON_FIELDS`, plus the safe public property card identity. Internal workflow, moderation, storage, and credential fields are never projected.

`items[].finishing` optionally contains localized names of selected, active finishing features. These choices are saved through the provider's **Features and services** step (`/provider/properties/:id/features-services`) and managed under `/admin/features`. The comparison reads them from `features_services`, restricted to the property's own selected feature IDs, `kind: feature`, and the `finishing` group (or legacy slugs with a separate `finish`/`finishing` word). Inactive choices and services cannot supply a finishing value. A missing choice remains unavailable; delivery readiness never implies a finishing condition. The existing comparison field key `deliveryStatus` is retained for compatibility and labels the finishing row; its displayed value now uses `finishing` rather than a permanent unavailable placeholder.

The endpoint is unauthenticated, returns `Cache-Control: no-store`, and does not create or mutate data.
