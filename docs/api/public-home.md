# Public homepage

`GET /api/v1/public/home` is unauthenticated and returns the published homepage read model.

The response contains `sections`, `categories`, `locations`, `properties`, `developers`, `content`, and `banners`. `locations` is the active, safe projection of the admin-managed locations and neighborhoods; the frontend submits its immutable `id` as the property-list filter. Each collection is filtered to its public state before projection: homepage sections and content must be published (and visible/active), properties must be published and active, developers must be approved developer companies, and locations must be active. Results use deterministic order/key sorting and return a safe empty array when optional CMS collections have no content.

Localized values use the supported `ar`, `en`, and `zh-CN` keys. Administrative status, active flags, provider identifiers, contact details, review metadata, and other workflow fields are not part of the public property projection.
