# GUIDE-14/15 local functional acceptance — 2026-09-12

## Reviewed scope

These journeys cover the provider property wizard and the complete review-result lifecycle. The evidence uses the real local browser, HTTP API, filesystem upload adapter, and MongoDB replica set without mocked routes.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Property creation | `guide-runs/property-lifecycle-local-latest.json` | A provider created a draft, saved location, details, price and payment plan, features, media, and contact data, then reviewed and submitted it. Incomplete basic data and a short submit reason were blocked before API mutation. |
| Review lifecycle | Same lifecycle report | The property moved through `pending_review`, `needs_changes`, revision, resubmission, approval, publication, a separate rejection branch, hide, and restore. Public detail changed between 200 and 404 with visibility as expected. |
| Authorization and concurrency | Same lifecycle report | Anonymous access returned 401, provider-only access with an admin returned 403, a limited administrator could not review, a foreign provider received 404, a suspended provider token returned 401, and a stale update returned 409. A duplicate submission returned 422 while status and version stayed unchanged. |
| Responsive and locale coverage | Same lifecycle report | PRV-01 through PRV-14 relevant states passed in Arabic and English on Desktop, Tablet, and Mobile. Every document response was 200, page errors were zero, and `scrollWidth` did not exceed `innerWidth`. |
| Empty and retry behavior | `guide-runs/provider-properties-recovery-local-latest.json` | The real owned-property list showed an empty filtered state, cleared it without navigation, exposed an explicit retry state while offline, and recovered through HTTP 200 without document reload in all six locale/device combinations. |
| Atomic audit guarantee | `guide-runs/property-guarantees-local-latest.json` | An injected durable-audit failure rolled back both the property review mutation and the inserted audit. Retrying the same expected version after rollback wrote one approved version and one audit. |
| MongoDB and cleanup | All three reports | Property, media, organization, audit, session, and validated private upload fixtures were removed. The isolated guarantee database was dropped. Existing Demo fixtures were preserved. |

## Remaining global work

GUIDE-14 and GUIDE-15 remain `PARTIAL` globally until independent Figma acceptance, the final project-wide quality gate, and Production verification are complete. Production remains deferred while the project stays in Demo mode.

No Production launch or Demo purge was executed.
