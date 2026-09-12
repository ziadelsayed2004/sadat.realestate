# GUIDE-26 local functional acceptance — 2026-09-13

GUIDE-26 covers administrator users, roles and permissions, administrator notifications, and the audit log.

| Scope | Evidence | Result |
|---|---|---|
| Eight responsive surfaces | `guide-runs/guide26-admin-rbac-local-latest.json` | ADM-59 through ADM-66 passed in Arabic and English on Desktop, Tablet, and Pixel 5. All 48 screen checks used the real local API, rendered the expected screen/state, raised no page error, and had no horizontal overflow. |
| Administrator lifecycle | The GUIDE-26 report | A temporary administrator was created and updated. Duplicate email and stale version requests returned 409. Exactly one create and one update audit were stored. |
| Role lifecycle | The GUIDE-26 report | A temporary role was created and updated. Duplicate name and stale version requests returned 409. Exactly one create and one update audit were stored. |
| Notifications and audit | The GUIDE-26 report | Permission-scoped administrator notifications were listed and marked read, read-all was exercised, and audit list/detail projections omitted secret, password and token fields. A limited administrator could not see a notification requiring an unassigned permission. |
| Validation, empty, and recovery | The GUIDE-26 report | Invalid administrator and role payloads returned 400 without writes. A combined valid filter returned a truthful empty result. ADM-59 recovered from offline mode through Retry without document navigation in all six locale/device configurations. |
| Authorization and current state | The GUIDE-26 report | Anonymous requests returned 401; the limited administrator was denied staff, role and audit resources; and a full administrator's existing session was denied after suspension. The administrator was restored immediately. |
| Atomic audit guarantees | `guide-runs/admin-rbac-guarantees-local-latest.json` | Eight isolated replica-set checks prove that injected durable-audit failures roll back administrator create/update, role create/update, and role assignment. Retries commit exactly once and the isolated database is removed. |

The verifier removed every temporary administrator, account, role, notification, session and audit record and restored the full administrator's original state. Horizontal tenant access is not applicable because these are global permission-gated administration records.

GUIDE-26 is `LOCAL_FUNCTIONAL_SCOPE_REVIEWED`. The 26/26 local journey review is complete. Global closure remains `PARTIAL` until the remaining direct Figma comparisons, the final project-wide quality gate, and Production verification are complete. Production remains deferred while the project stays in Demo mode.
