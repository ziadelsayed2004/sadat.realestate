# Action log choices

The action log at `/admin/audit-logs` explains who changed a record and when. The section, change type and date range are ordinary choices. Account, record and support trace IDs are optional under a collapsed advanced search. Selecting a section is required before searching by record ID. Invalid IDs and reversed dates show specific guidance.

Known sections, actor roles and action codes have Arabic and English display labels. The original action code remains available in record details. Unknown stored codes are preserved rather than guessed. Reset clears both the displayed controls and the server query. Pagination keeps the applied filters; date boundaries use the browser's local day.

`GET /api/v1/admin/audit-logs` accepts optional `actionGroup`: `create`, `update`, `delete`, `review`, `approve`, `reject`, `visibility`, `access`, or `communication`. Each group matches fixed recorded action suffixes from `AUDIT_ACTION_GROUP_SUFFIXES`, across the complete server query before pagination and counting. For example, `update` includes `property.update`, `admin.administrator_updated` and `cms.team.write`. Review/status actions such as `property.review` and `article.transition` remain in the review group, since their codes represent multiple possible decisions. Existing exact `action` filters remain supported and intersect a group if both are supplied. Clients cannot provide regex patterns. Authorization, append-only audit evidence and server redaction are unchanged.

Audit copy and labels are split into a small build chunk to keep the administrator bundle within its existing size limit.

Validation: 24 audit API tests, 9 web tests, real local Mongo grouping/count/pagination checks, 14 browser checks including six Arabic/English desktop/tablet/mobile filter journeys, API/web type checks, ESLint, production web build with unchanged bundle limits, API contract audit and OpenAPI validation.

Local Mongo verification (temporary QA database on the local test replica set, dropped afterward):

```powershell
node --import tsx scripts/verify-audit-filters-local.mjs
```

The production site requires the normal deployment after pulling the commit. No production audit records are created or modified by verification.
