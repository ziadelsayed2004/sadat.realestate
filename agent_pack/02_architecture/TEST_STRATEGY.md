# Test Strategy

| Level | Scope |
|---|---|
| Unit | Policies, resolvers, validators, mappers, and state transitions |
| Integration | Repositories, MongoDB indexes and transactions, storage adapters |
| API | Authentication, RBAC, ownership, validation, errors, idempotency |
| Contract | OpenAPI response compatibility and generated client |
| Frontend component | States, localization, permissions, and forms |
| End-to-end | User journeys for each surface with repeatable fixtures |
| Visual | Screen IDs, viewports, and locales |
| Security | IDOR, upload, injection, session, replay, and rate limits |
| Performance | Property search, admin lists, SSR, and Core Web Vitals |

Live-provider checks do not belong in the normal suite. If credentials, replica-set support, or isolated UAT data are unavailable, record `Blocked — prerequisites unavailable`; never report Passed.
