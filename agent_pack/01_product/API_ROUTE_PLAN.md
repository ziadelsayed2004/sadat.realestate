# Planned API Route Surface

هذه خطة أسماء، وليست ادعاء تنفيذ. OpenAPI runtime هو المرجع بعد التنفيذ.

| Module | Representative routes |
|---|---|
| Health | `GET /health`, `GET /ready` |
| Auth | `POST /api/v1/auth/login`, `otp/send`, `otp/verify`, `refresh`, `logout` |
| Me | `GET/PATCH /api/v1/me`, `GET/PATCH /api/v1/me/preferences` |
| Provider application | `POST/GET/PATCH /api/v1/provider/application`, `submit`, `documents` |
| Public home | `GET /api/v1/public/home` |
| Properties | `GET /api/v1/public/properties`, `/:slug`, `POST /compare` |
| Developers | `GET /api/v1/public/developers`, `/:slug` |
| Articles/community | `GET /api/v1/public/articles`, `community/posts`; authenticated mutations under `/me/community` |
| Seeker | `/api/v1/seeker/overview`, `requests`, `viewings`, `favorites`, `notifications` |
| Provider | `/api/v1/provider/properties`, `projects`, `requests`, `viewings`, `ads`, `commission` |
| Property wizard | `POST /provider/properties`, `PATCH /:id/steps/:step`, `POST /:id/submit`, media subresource |
| Admin accounts | `/api/v1/admin/users`, `providers`, `verification`, `account-reports`, `restrictions` |
| Admin master data | `locations`, `property-categories`, `property-types`, `features`, `services` |
| Admin properties | `projects`, `properties`, `reviews`, `possible-duplicates`, `property-reports` |
| Admin requests | `requests`, `overdue-requests`, `viewings`, `search-requests`, `request-issues` |
| Admin content | `articles`, `article-categories`, `community`, `about`, `team`, `homepage` |
| Admin ads/payments | `ad-requests`, `quotes`, `payment-proofs`, `ad-calendar`, `banners` |
| Admin commissions | `commission-policies`, `account-commissions`, `commission-exceptions`, `confirmations` |
| Admin security | `admin-users`, `roles`, `notifications`, `audit-logs`, `settings` |

كل endpoint يُضاف فقط عندما توجد validation/role/permission/ownership/response/errors/tests/Postman/UI binding.
