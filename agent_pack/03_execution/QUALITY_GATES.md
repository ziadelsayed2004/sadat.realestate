# Quality Gates

## Every Task

- Scope and dependencies were read.
- Code, contracts, tests, and documentation agree.
- Required tests pass or are Blocked for a precise prerequisite.
- No secrets or production data were used.
- Completion evidence exists before closure.

## Backend Gate

- Install, build, lint, typecheck, unit, integration, and API checks pass as applicable.
- OpenAPI, runtime inventory, and Postman agree.
- Sensitive routes have negative authorization coverage.
- Security, performance, backup, and readiness reports are evidence-based.

## Frontend Gate

- All 131 Screen IDs are mapped and visually reviewed.
- No production mock or invented endpoint exists.
- Loading, Empty, Error, Retry, Success, and permission states are complete.
- Supported locales, directions, and device scopes are covered.
- End-to-end, visual, accessibility, performance, and browser-security gates pass as applicable.
