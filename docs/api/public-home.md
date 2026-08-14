# Public homepage

`GET /api/v1/public/home` is unauthenticated and returns the published homepage read model.

The response contains `sections`, `properties`, `developers`, `content`, and `banners`. Each collection is filtered to its public state before projection: homepage sections and content must be published (and visible/active), properties must be published and active, and developers must be approved developer companies. Results use deterministic order/key sorting and return a safe empty array when optional CMS collections have no content.

Localized values use the supported `ar`, `en`, and `zh-CN` keys. Administrative status, active flags, provider identifiers, contact details, review metadata, and other workflow fields are not part of the public property projection.
