# API Conventions

## Base

- Prefix: `/api/v1` مرة واحدة.
- JSON UTF-8، timestamps ISO-8601 UTC، وعرض timezone في الواجهة.
- IDs strings؛ لا تكشف internal sequences.

## Success

`{ "data": ..., "meta": { "requestId": "...", "page": ... } }`

## Error

`{ "error": { "code": "PROPERTY_NOT_FOUND", "messageKey": "errors.propertyNotFound", "details": [], "requestId": "..." } }`

## Lists

`page/limit` أو cursor وفق طبيعة المورد، مع max limit، allowlisted sort/filter، وtotal فقط عندما يكون عمليًا.

## Mutation Safety

- Validation قبل service.
- Idempotency-Key للعمليات المعرضة لإعادة الإرسال.
- If-Match/version للمسودات والإعدادات الحساسة.
- الحالة الجديدة و`availableActions` تعود بعد كل transition.

## Security

- Bearer access token؛ refresh opaque داخل HttpOnly Secure cookie.
- permission + ownership policies داخل API.
- private files عبر authorized short-lived delivery.
