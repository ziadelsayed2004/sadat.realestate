# Journey-based Postman collection

`apps/api/postman/Sadat-Real-Estate.journeys.postman_collection.json` is a supplementary workflow collection. It groups representative executable routes into **Public**, **Seeker**, **Provider**, **Admin**, and **Setup & Cleanup** journeys. Each request has a small Postman test script that records the expected positive, validation, authorization, unavailable, or cleanup-safe response class.

The collection uses only loopback defaults and synthetic placeholders (`syntheticBearer`, zero-like IDs, and an invalid example email). It contains no real credentials, tokens, production URLs, account data, or secret-typed variables. A bearer placeholder must be replaced only in an isolated local/test run; no checked-in value is usable for authentication.

The canonical all-route collection remains `Sadat-Real-Estate.postman_collection.json`. The journey validator allows a representative subset but requires every journey request to resolve to an executable runtime route, requires all five groups, rejects unknown/planned paths, and requires a test script on every request. `npm run postman:validate` validates both collections and the synthetic environment.

The collection does not create production data automatically. Setup requests use safe synthetic payloads; cleanup is limited to idempotent logout/favorite mutation examples and should only be run against an isolated non-production environment.
