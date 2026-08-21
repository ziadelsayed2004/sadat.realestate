# Provider settings runtime truth

The provider settings API exposes only the authenticated verified provider's safe account and contact projection:

- `GET /api/v1/provider/settings`
- `PATCH /api/v1/provider/settings`

Both operations require a provider access token. The API derives the owner from the token subject and requires the persisted identity to be an active verified provider with a provider application. No provider ID is accepted from the client, so the settings resource is recipient-owned and does not support cross-provider access.

The response may contain `version`, `email`, `phone`, `whatsappNumber`, `officeAddress`, `website`, and `availableActions`. It does not contain user IDs, provider application IDs, legal or trade data, permissions, audit data, storage keys, secrets, or private document URLs.

`PATCH` requires `expectedVersion` and accepts only mutable contact fields: `email`, `whatsappNumber`, `officeAddress`, and `website`. Writes use optimistic concurrency and return a conflict when the version is stale. Legal and trade data are not editable through this resource. Password changes and account deletion are not represented because no approved runtime contracts exist for those operations.

When a provider settings record does not yet exist, the repository can initialize it from the provider identity and application contact projection. Local and test environments can use the service boundary with deterministic repositories; live MongoDB verification remains a separate non-production readiness check.
