# Backend Architecture

## الطبقات

Route → auth/rate-limit/validation → Controller → Application Service → Domain Policy → Repository/Provider → Response mapper.

## Modules

identity، auth، admin-rbac، accounts، audit، locations، taxonomy، organizations، providers، projects، properties، media، search، favorites، requests، viewings، notifications، articles، community، moderation، ads، payments، commissions، settings، reports.

## مبادئ

- REST `/api/v1` وعقود OpenAPI 3.1.
- Zod-style runtime schemas مشتركة، TypeScript strict، no implicit any.
- Mongoose schemas مع explicit indexes وtimestamps وoptimistic concurrency حيث توجد مسودات.
- single-document atomicity أولًا؛ transaction فقط لعبور عدة aggregates مع replica set.
- outbox داخل transaction للأحداث التي لا يجوز فقدها؛ worker idempotent مع retry/dead-letter.
- كل list endpoint: allowlisted filters/sort/search وpage/cursor وحد أقصى.
- كل response حساس projection صريح، وليس `toJSON` الخام.

## التوثيق والاختبار

- كل route منفذ يظهر في OpenAPI/inventory/Postman أو يصنف internal.
- كل mutation: positive + unauthenticated + unauthorized/ownership + validation + invalid transition.
- العمليات الحساسة: idempotency/replay/concurrency tests.
