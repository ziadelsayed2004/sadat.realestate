# Shared API contracts

`@sadat-real-estate/contracts` is the canonical source for transport envelopes and their runtime validation. It exports strict Zod schemas plus inferred TypeScript types from its public package entrypoint.

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
