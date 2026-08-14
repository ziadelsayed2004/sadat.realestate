# Property model and source identity

The property aggregate is the shared boundary for provider listings and their units. It stores a strict localized name, stable lowercase slug, `sale` or `rent` transaction type, provider ownership, optional project/parent-unit relationships, explicit source type, lifecycle status, and an activation flag. Unknown fields are rejected and the provider/source relationship is immutable after creation.

`source` contains only persisted relationships (`providerId`, `sourceType`, and the required organization for office/developer sources). It deliberately has no writable `verified` flag. Public source identity is derived from the current provider and organization approval states through the existing source-identity resolver; a badge is true only for genuinely approved records. No government, ownership, bank, registry, or automatic verification is implied.

The model supports deterministic provider, project/public-status, and status/activation lookups. Public routes are not added by this model task; the endpoint blueprint remains the authority for later property route tasks. Empty or draft property data is a safe state until those routes and production content are implemented.
