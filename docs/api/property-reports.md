# Property reports

Property reports are explicit, auditable moderation records. A verified seeker, provider, or administrator can report a property with one of the stable reasons `duplicate`, `fraud`, `inaccurate`, `inappropriate`, or `other`. Optional details are bounded and never contain credentials or secrets.

## Create a report

`POST /api/v1/provider/properties/:propertyId/reports`

The bearer subject is recorded as the reporter. The uniqueness boundary is `(propertyId, reporterId, reason)`; replaying the same reason returns a conflict instead of creating another report. The response intentionally omits `reporterId`.

## Review reports

`GET /api/v1/admin/property-reports` requires `admin:property-reports.view`. Results are paginated and can be filtered by status or property. Reporter identity is included only when the administrator also has `admin:property-reports.manage`.

`POST /api/v1/admin/property-reports/:reportId/resolve` requires `admin:property-reports.manage`, a current `version`, a `resolve` or `dismiss` action, and a reason. Transitions are optimistic-concurrency guarded and only `open` or `in_review` reports can be closed. Every create and resolution is written to the audit stream.

The implementation uses deterministic reasons and state transitions; it does not infer fraud, ownership, government verification, or AI matches. Live MongoDB transaction tests require an isolated replica set and are not run in this environment.
