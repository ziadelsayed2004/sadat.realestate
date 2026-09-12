# GUIDE-22 local functional acceptance — 2026-09-12

## Reviewed scope

GUIDE-22 covers ADM-25 through ADM-32: articles, article categories, community posts, comments and reports, About, Team, and the population counter. The evidence uses the real local browser, HTTP API, RBAC state, and MongoDB without mocked routes.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Eight administration screens | `guide-runs/guide22-admin-content-browser-local-latest.json` | All eight routes loaded through real APIs in Arabic and English on Desktop, Tablet, and Pixel 5: 48 visits, HTTP 200, no page errors, and no horizontal overflow. |
| Article and category lifecycle | `guide-runs/guide22-content-mutations-local-latest.json` | A unique category and draft article were created, the draft stayed private, direct publication was rejected, review then publication succeeded, concurrent publication produced one 200 and one 409, and the public projection excluded administration fields. Duplicate category creation returned 409. |
| About, Team, and population | Same evidence | Temporary About and Team records were created and published with required reasons and versions. About concurrency produced 200/409. An unsourced population value returned 400; a sourced update succeeded; a stale update returned 409. The original population documents were restored byte-for-byte after the run. |
| Community moderation and reports | `guide-runs/community-local-latest.json`, `guide-runs/community-guarantees-local-latest.json`, and the mutation evidence | Post moderation, reason validation, public visibility, optimistic concurrency, duplicate report rejection, report resolution, and audit records passed. The existing community guarantee run proves transactional rollback for moderation. |
| Empty and offline recovery | `guide-runs/community-browser-recovery-local-latest.json` | Empty search can be cleared and an offline request can be retried without document navigation in both locales on all three device profiles. |
| Authorization and current state | Mutation evidence | Anonymous access returned 401, the limited administrator received 403 for direct content/CMS/report actions, and suspending the current Super Admin invalidated its previously issued token immediately. |
| Atomic audit integrity | Mutation evidence | Forced audit failure inside real replica-set MongoDB transactions rolled back an article-category mutation, an About mutation, and a community-report mutation; none of the records persisted. |
| Cleanup | Both GUIDE-22 runs | Temporary articles, categories, CMS records, reports, audit rows, and sessions were removed; the residue counters are zero and Demo fixtures remain present. |

## Remaining global work

GUIDE-22 remains `PARTIAL` globally until independent Figma acceptance, the final project-wide quality gate, and Production verification are complete. Production requires explicit user approval.

No Production launch or Demo purge was executed.
