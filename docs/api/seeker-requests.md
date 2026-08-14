# Seeker Requests and Details

Seeker request list and detail projections are ownership-scoped and return bounded lifecycle data, including `under_review` and `contacted` states. A request from another seeker is indistinguishable from not-found.

Seeker projections do not expose administrative assignments, SLA due dates, creator metadata, internal notes, or other CRM-only fields. Pagination is bounded and deterministic; empty results are represented as an empty list with a truthful total.
