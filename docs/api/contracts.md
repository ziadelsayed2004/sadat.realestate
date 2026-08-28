# Shared API contracts

Private provider-document contracts are exported from `@sadat-real-estate/contracts` with independent security and business-review states, safe document metadata, strict upload headers, 300-second access-grant responses, and deletion responses. No contract exposes a storage key, credential, permanent public URL, internal note, or document bytes inside a JSON envelope.

Account-state contracts expose closed action catalogs, strict mandatory-reason requests, current state/version projections, server-derived `availableActions`, and the immutable transition identifier. Provider review projections keep account and application states explicit and do not expose internal documents, audit storage, or unsupported verification flags.

Audit contracts expose strict actor, target, action, reason, request, and trace identifiers plus bounded redacted before/after snapshots. List filters are allowlisted, pagination is capped at 100 records per request, and a target ID cannot be queried without its target type. The explicit audit response projection never contains credentials, bearer values, signed URLs, private storage keys, email addresses, or phone numbers.

Location contracts use the shared strict `LocalizedText` primitive, stable lowercase slugs, explicit `location` or `neighborhood` kinds, optional bounded coordinates, optional absolute HTTPS `mapUrl` values up to 2048 characters, deterministic non-negative ordering, activation state, and optimistic versions. Property location sources retain `locationId` and coordinates for compatibility; a validated `mapUrl` is sufficient when those legacy sources are absent. The server never fetches or geocodes the URL. Neighborhoods require a valid top-level parent. Mutation DTOs reject unknown fields and require a bounded audit reason; list filters and sorting are allowlisted and capped at 100 records.

`@sadat-real-estate/contracts` is the canonical source for transport envelopes and their runtime validation. It exports strict Zod schemas plus inferred TypeScript types from its public package entrypoint.

Media governance contracts separately model public/private namespaces, lifecycle states, opaque storage-key shape, legal holds, retention reasons, and deterministic cleanup decisions. They do not expose binary contents or production storage credentials.

Successful responses use:

```json
{
  "data": { "id": "example" },
  "meta": { "requestId": "req-123" }
}
```

Error responses use:

```json
{
  "error": {
    "code": "PROPERTY_NOT_FOUND",
    "messageKey": "errors.propertyNotFound",
    "details": [],
    "requestId": "req-123"
  }
}
```

Envelopes reject unknown fields. Error codes are uppercase snake-case identifiers so later domain modules can add codes without changing the foundation. Message keys are stable localization keys; user-facing text is not placed in the transport envelope. Validation details contain only a bounded path, code, and message key. Stack traces, connection strings, credentials, and arbitrary internal metadata are never part of the contract.

The operational `/health` and `/ready` endpoints remain intentionally unwrapped because they are process/dependency probes. Product routes added by later tasks must use these shared envelopes and update their OpenAPI schemas and tests together.
