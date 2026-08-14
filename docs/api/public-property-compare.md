# Public property comparison

`POST /api/v1/public/properties/compare` compares one or two public property IDs.

The request body is strict and accepts only a unique `propertyIds` array containing one or two MongoDB ObjectId strings. Every requested property must be both `published` and `active`; draft, inactive, missing, or otherwise malformed records fail closed with `PROPERTY_UNAVAILABLE`.

The response preserves request order and exposes only the fixed comparison fields `name`, `transactionType`, `price`, `area`, and `layout`, plus the safe public property card identity. Internal workflow, moderation, storage, and credential fields are never projected.

The endpoint is unauthenticated, returns `Cache-Control: no-store`, and does not create or mutate data.
