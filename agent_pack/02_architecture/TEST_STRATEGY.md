# Test Strategy

| المستوى | النطاق |
|---|---|
| Unit | policies/resolvers/validators/mappers/state transitions |
| Integration | repositories/Mongo indexes/transactions/storage adapters |
| API | auth/RBAC/ownership/validation/errors/idempotency |
| Contract | OpenAPI response compatibility/generated client |
| Frontend component | states/i18n/permissions/forms |
| E2E | user journeys لكل surface مع fixtures قابلة للإعادة |
| Visual | Screen IDs والمقاسات واللغات |
| Security | IDOR/upload/injection/session/replay/rate limits |
| Performance | property search/admin lists/SSR/Core Web Vitals |

لا تعتمد اختبارات live provider ضمن suite عادي. إذا غابت credentials أو replica set أو isolated UAT، النتيجة `Blocked — prerequisites unavailable` وليست Passed.
