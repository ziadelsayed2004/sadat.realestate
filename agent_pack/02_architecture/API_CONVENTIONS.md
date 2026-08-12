# API Conventions

## Base

- Apply `/api/v1` exactly once.
- Use UTF-8 JSON and ISO-8601 UTC timestamps; presentation timezone belongs to the client.
- Expose identifiers as strings and never reveal internal sequences.

## Success Envelope

`{ "data": ..., "meta": { "requestId": "...", "page": ... } }`

## Error Envelope

`{ "error": { "code": "PROPERTY_NOT_FOUND", "messageKey": "errors.propertyNotFound", "details": [], "requestId": "..." } }`

## Lists

Use page/limit or cursor pagination according to the resource, with a maximum limit, allowlisted sorting and filtering, and total counts only when practical.

## Mutation Safety

- Validate before entering the service layer.
- Use `Idempotency-Key` for replay-prone operations.
- Use `If-Match` or a version field for drafts and sensitive settings.
- Return the new state and `availableActions` after every transition.

## Security

- Use bearer access tokens and opaque refresh tokens in HttpOnly Secure cookies.
- Enforce permissions and ownership inside the API.
- Deliver private files through authorized short-lived access.
