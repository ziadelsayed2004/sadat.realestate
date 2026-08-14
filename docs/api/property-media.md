# Property media

Verified providers upload JPEG/PNG images and PDF/JPEG/PNG floor plans through `POST /api/v1/provider/properties/:propertyId/media`. The media kind and filename are explicit headers; binary bytes are validated by signature, hashed, stored in private quarantine, and scanned before the record becomes `ready`.

`PATCH /api/v1/provider/properties/:propertyId/media/order` changes bounded deterministic ordering and can select one active ready cover. `DELETE /api/v1/provider/properties/:propertyId/media/:assetId` is owner-scoped and only editable for active draft or needs-changes properties. Processing failures are retained as failed metadata without exposing private storage keys.

Public projections must use only active, ready media belonging to a published and active property. Draft, failed, deleted, and inactive media never enter a public projection.
