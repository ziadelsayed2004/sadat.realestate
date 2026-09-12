# GUIDE-20 local functional acceptance — 2026-09-12

## Reviewed scope

GUIDE-20 covers administrator property categories, locations, features and services, projects and project review, properties and property review, possible duplicates, and property reports for full and limited administrators.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Nine responsive surfaces | `guide-runs/remaining-surfaces-local-latest.json` | ADM-09 through ADM-17 passed in Arabic and English on Desktop, Tablet, and Pixel 5 with real API responses, no page errors, and no horizontal overflow. |
| Master-data lifecycle | `guide-runs/guide20-admin-property-setup-local-latest.json` | Category, location, and feature records were created, updated with an expected version, rejected with 409 when stale, and deleted through real HTTP. The database and reasoned audits matched every successful transition. |
| Project, property, and report lifecycle | The GUIDE-20 report plus `guide-runs/property-lifecycle-local-latest.json` | A pending project was approved then published, a property report was resolved, and stale decisions returned 409. The existing reviewed property lifecycle covers submission, review, publication, visibility, duplicate-candidate surfaces, and ownership boundaries. |
| Validation, empty, and recovery | The GUIDE-20 report | A short reason returned 400 without a write, an absent taxonomy query returned a true empty result, and ADM-09 recovered from browser offline mode through Retry without a reload in all six locale/device configurations. |
| Authorization and current state | The GUIDE-20 report | Anonymous access returned 401, limited-administrator mutations returned 403, and a full administrator's existing token was denied after suspension. The administrator was restored immediately. |
| Atomic audit | `guide-runs/admin-property-setup-guarantees-local-latest.json` | Injected durable-audit failures rolled back taxonomy, feature, location, project-review, and property-report mutations and inserted audits. Retrying wrote each record once, while stale project and report versions produced conflicts without extra audits. |
| Cleanup | Both GUIDE-20 reports | Temporary master data, project, property report, audits, sessions, and the isolated guarantee database were removed. Existing Demo data was unchanged. |

## Defects fixed during review

- Feature creation no longer passes the audit-only `reason` field into the strict MongoDB record schema.
- Taxonomy and feature mutations now write their record and mandatory audit inside one MongoDB transaction.
- Location deletion performs its reference checks sequentially inside the transaction, avoiding the runtime failure caused by parallel operations on one session.

## Remaining global work

GUIDE-20 remains `PARTIAL` globally until independent Figma acceptance, the final project-wide quality gate, and Production verification are complete. Production remains deferred while the project stays in Demo mode.

No Production launch or Demo purge was executed.
