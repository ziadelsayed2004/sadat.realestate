# Public property listing and search

`GET /api/v1/public/properties` is unauthenticated. It always starts from `status=published` and `active=true`, then applies the allowlisted `kind`, `transactionType`, `projectId`, `locationId`, `search`, `minPrice`, `maxPrice`, and `bedrooms` filters.

`sort` accepts only `publishedAt`, `price`, `name`, or `slug`; `direction`, `page`, and `limit` are bounded and default deterministically. Unknown keys, Mongo operator-shaped keys, invalid ranges, and unbounded limits are rejected before a query is built. The response contains pagination metadata and a safe public property projection without workflow state, active flags, contacts, provider identifiers, or review fields.
