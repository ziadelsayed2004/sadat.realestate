# Provider property features, services, and contact data

Verified providers save the `features-services` and `contact` wizard steps through the existing optimistic-concurrency endpoint:

`PATCH /api/v1/provider/properties/:propertyId/steps/:step`

The feature and service fields contain stable master-data IDs (`featureIds` and `serviceIds`), each capped at 50 entries and rejecting duplicates or cross-kind overlap. The property document keeps these relationships as references to the feature/service master-data collection; display labels remain localized master data rather than persisted Arabic logic.

Contact data is an optional, strict object containing a display name, normalized E.164 phone or WhatsApp number, email, and preferred locale. It cannot override the property source identity, contain credentials, or contain arbitrary fields. It remains provider-owned draft data and is returned only through the authenticated owner projection; any future public projection must continue to require published and active state.

Both steps require the current property `version` and a mutation `reason`. Updates are ownership-scoped, audited, and fail with a version conflict when replayed against a stale version.
