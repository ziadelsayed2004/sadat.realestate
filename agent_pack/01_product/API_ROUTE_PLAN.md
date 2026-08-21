# Planned API Route Surface

This is a naming plan, not an implementation claim. Runtime OpenAPI and endpoint inventory become authoritative after implementation.

| Module | Representative Routes |
|---|---|
| Health | `GET /health`, `GET /ready` |
| Auth | `POST /api/v1/auth/login`, `otp/send`, `otp/verify`, `refresh`, `logout` |
| Me | `GET/PATCH /api/v1/me`, `GET/PATCH /api/v1/me/preferences` |
| Provider application | `POST/GET/PATCH /api/v1/provider/application`, `submit`, private `documents`, access grants, and exact-object download redemption |
| Public home | `GET /api/v1/public/home` |
| Properties | `GET /api/v1/public/properties`, `/:slug`, `POST /compare` |
| Developers | `GET /api/v1/public/developers`, `/:slug` |
| Articles, community, About, and Team | Implemented Article reads under `/api/v1/public/article-categories` and `/api/v1/public/articles`; implemented Article administration under `/api/v1/admin/article-categories` and `/api/v1/admin/articles`; Community reads/mutations under `/api/v1/public/community`; About and Team reads under `/api/v1/public/about` and `/api/v1/public/team` |
| Seeker | `/api/v1/seeker/overview`, `requests`, `viewings`, `favorites`, `notifications` |
| Provider | `/api/v1/provider/properties`, `projects`, `requests`, `viewings`, `ads`, `commission` |
| Property wizard | `POST /provider/properties`, `PATCH /:id/steps/:step`, `POST /:id/submit`, and media subresources |
| Admin accounts | `/api/v1/admin/users`, `providers`, `verification`, `account-reports`, `restrictions` |
| Admin master data | `locations`, `property-categories`, `property-types`, `features`, `services` |
| Admin properties | `projects`, `properties`, `reviews`, `possible-duplicates`, `property-reports` |
| Admin requests | `requests`, `overdue-requests`, `viewings`, `search-requests`, `request-issues` |
| Admin content | `articles`, `article-categories`, `community`, `about`, `team`, `homepage` |
| Admin ads and payments | `ad-requests`, `quotes`, `payment-proofs`, `ad-calendar`, `banners` |
| Admin commissions | `commission-policies`, `account-commissions`, `commission-exceptions`, `confirmations` |
| Admin security | `admin-users`, `roles`, `notifications`, `audit-logs`, `settings` |

Add an endpoint only when validation, role, permission, ownership, response, error, tests, Postman, and UI binding are defined as applicable.
