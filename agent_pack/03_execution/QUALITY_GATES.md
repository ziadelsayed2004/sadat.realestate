# Quality Gates

## كل مهمة

- scope وdependencies مقروءة.
- code/contract/docs متزامنة.
- tests المطلوبة ناجحة أو Blocked بسبب محدد.
- لا secrets ولا data production.
- completion evidence موجود.

## Backend Gate

- install/build/lint/typecheck/unit/integration/API.
- OpenAPI ↔ runtime inventory ↔ Postman متطابقة.
- negative authorization coverage للمسارات الحساسة.
- security/performance/backup/readiness reports.

## Frontend Gate

- كل 131 Screen ID mapped ومراجع بصريًا.
- لا mock production أو endpoint مخترع.
- loading/empty/error/success + permissions.
- اللغات والاتجاه والأجهزة ضمن النطاق.
- E2E/visual/a11y/performance/security.
