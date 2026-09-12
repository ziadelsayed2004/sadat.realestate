# GUIDE-24 local functional acceptance — 2026-09-13

## Reviewed scope

GUIDE-24 covers commission policies, policy creation, change history, account commission resolution and override creation, exceptions and exception creation, and confirmations.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Seven responsive surfaces | `guide-runs/remaining-surfaces-local-latest.json` | ADM-39 through ADM-45 passed in Arabic and English on Desktop, Tablet, and Pixel 5 with real API responses, no page errors, and no horizontal overflow. |
| Creation and conflicts | `guide-runs/guide24-admin-commissions-local-latest.json` | A policy, exception, and account override were created through real HTTP and MongoDB. Repeating each unique creation returned 409 without a second record or audit. |
| History and safe reads | The GUIDE-24 report | Policy, account, exception, confirmation, and change-log reads returned 200. Each new record appeared once in the filtered change log with a reason, request ID, trace ID, and safe before/after projections. |
| Validation, empty, and recovery | The GUIDE-24 report | Invalid queries and a short exception reason returned 400 without writes. An absent archived-policy query rendered a true empty state, and ADM-39 recovered from offline mode through Retry without document navigation in all six configurations. |
| Authorization and current state | The GUIDE-24 report | Anonymous access returned 401, limited-administrator mutations returned 403, and a full administrator's existing token was denied after suspension. The administrator was restored immediately. |
| Atomic audit | `guide-runs/commission-audit-guarantees-local-latest.json` | Injected audit failures rolled back policy, exception, and override creation plus the inserted audits. Retrying committed exactly one audit per record, and duplicate attempts added none. |
| Cleanup | Both GUIDE-24 reports | Temporary commission records, audits, sessions, and the isolated database were removed. Existing Demo data was unchanged. |

The current commission UI exposes creation and read flows only, so an `expectedVersion` update conflict is not applicable to this UI scope. Duplicate create conflicts are covered directly.

## Defect fixed during review

Policy, exception, and account-override creation now persist their mandatory change-log audit in the same MongoDB transaction as the created record. The history screen therefore reflects real successful changes and cannot retain an audit for a rolled-back record.

## Remaining global work

GUIDE-24 remains `PARTIAL` globally until independent Figma acceptance, the final project-wide quality gate, and Production verification are complete. Production remains deferred while the project stays in Demo mode.

No Production launch or Demo purge was executed.
