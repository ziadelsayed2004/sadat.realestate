# Runtime route inventory

The executable route inventory is derived from the route-definition constants imported by the Express routers. Run:

```text
npm run api:inventory
```

The command prints a deterministic list of `{ method, path, operationId, status }` entries. `status` is always `implemented` in this inventory; planned items from the product blueprint are intentionally not copied into it. Duplicate method/path pairs, unsupported methods, malformed paths, invalid operation IDs, and non-implemented status claims fail the focused inventory tests.

The same route-definition source is used by the OpenAPI and Postman validators. Their normalized method/path sets must match exactly, including operational `/health` and `/ready` probes. Parameter notation is normalized only between Express `:id` and OpenAPI `{id}`; no `/api/v1` prefix is inferred or duplicated. Authentication, role, ownership, and mutation behavior remain defined by the owning router/service tests rather than being guessed from this documentation projection.

This is a runtime truth artifact, not a roadmap. Missing production data, provider credentials, and unimplemented blueprint rows do not appear as fake endpoints.
