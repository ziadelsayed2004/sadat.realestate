# GUIDE-25 local functional acceptance — 2026-09-13

## Reviewed scope

GUIDE-25 covers banner management, property tips, homepage content, platform and contact data, social accounts, property and advertising settings, SEO, privacy/security, and display settings.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Twelve responsive surfaces | `guide-runs/guide25-admin-home-settings-local-latest.json` | ADM-46 through ADM-53 and ADM-55 through ADM-58 passed in Arabic and English on Desktop, Tablet, and Pixel 5. All 72 screen checks used the real local API, rendered the expected screen/state, raised no page error, and had no horizontal overflow. |
| Banner lifecycle and conflicts | The GUIDE-25 report | A temporary placement and draft banner were created, the banner was updated with optimistic versioning, a duplicate create returned 409, and a stale update returned 409. Exactly one create audit and one update audit were stored. |
| Settings lifecycle and conflicts | The GUIDE-25 report | The one configured namespace was updated and the seven truthful empty namespaces were created through real HTTP. A stale update returned 409. All eight changes produced exactly one reasoned audit with request and trace IDs. |
| Tips and homepage content | `guide-runs/guide22-content-mutations-local-latest.json` | The existing real CMS lifecycle evidence covers create/update, validation, version conflict, authorization, atomic audit rollback, and cleanup for tips and homepage sections. |
| Validation, empty, and recovery | The GUIDE-25 report | Invalid banner and settings payloads returned 400 without writes. A unique absent banner placement returned a truthful empty collection. ADM-50 recovered from offline mode through Retry without document navigation in all six locale/device configurations. |
| Authorization and current state | The GUIDE-25 report | Anonymous settings and banner reads returned 401, limited-administrator mutations returned 403, and a full administrator's existing token was denied after suspension. The administrator was restored immediately. |
| Atomic audit | `guide-runs/admin-settings-guarantees-local-latest.json`, `guide-runs/admin-banner-guarantees-local-latest.json`, and the GUIDE-22 mutation report | Injected audit failures rolled back settings, banner create/update, tips, and homepage mutations together with their inserted audits. Retries committed once, while stale and duplicate attempts added no audit. |
| Cleanup | All referenced reports | The banner, temporary placement, created settings namespaces, audits, sessions, and isolated databases were removed. The original privacy/security document was restored byte-for-byte at the BSON field level. Existing Demo data was unchanged. |

## Defects fixed during review

Settings updates and banner create/update now persist their record and mandatory audit in the same MongoDB transaction. A failed audit can no longer leave a changed setting or banner behind, and an aborted record can no longer retain an audit.

## Remaining global work

GUIDE-25 remains `PARTIAL` globally until independent Figma acceptance, the final project-wide quality gate, and Production verification are complete. Production remains deferred while the project stays in Demo mode.

No Production launch or Demo purge was executed.
