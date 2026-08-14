# Seeker saved properties

Saved properties are seeker-owned and require a seeker bearer access token:

- `GET /api/v1/seeker/favorites` lists bounded saved-property projections.
- `PUT /api/v1/seeker/favorites/:propertyId` saves a published active property; repeated saves are idempotent and report `alreadySaved`.
- `DELETE /api/v1/seeker/favorites/:propertyId` removes a save idempotently.

Only the authenticated seeker’s records are read or changed. Properties that become draft, unpublished, inactive, missing, or otherwise unavailable are omitted from listings and cannot be newly saved. Internal seeker IDs, workflow fields, contact data, and storage metadata are never projected.
