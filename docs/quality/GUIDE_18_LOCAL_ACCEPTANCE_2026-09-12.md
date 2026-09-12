# GUIDE-18 local functional acceptance — 2026-09-12

## Reviewed scope

GUIDE-18 covers provider-owned notifications and the provider account, contact, and security settings surfaces. The security actions are intentionally unavailable in the current product contract and remain visibly disabled.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Responsive surfaces | `guide-runs/remaining-surfaces-local-latest.json` | PRV-21 and PRV-22-1/2/3 passed in Arabic and English on Desktop, Tablet, and Pixel 5 with real API responses, no page errors, and no horizontal overflow. |
| Notification success and empty state | `guide-runs/guide18-provider-notifications-settings-local-latest.json` | A provider-owned unread notification was displayed and marked read, mark-all persisted, and the unread tab then rendered a true empty state in all six browser configurations. |
| Settings validation and save | Same GUIDE-18 report | Invalid phone data showed validation with zero PATCH requests. Valid contact data persisted through PATCH 200, advanced the version, and wrote a `provider.settings.update` audit. A stale update returned 409 without changing the saved row. |
| Network recovery | Same GUIDE-18 report | Notifications recovered from browser offline mode and settings recovered from an aborted real API read through explicit Retry controls without document navigation. |
| Authorization and ownership | Same GUIDE-18 report | Anonymous requests returned 401, an administrator could not use provider endpoints, a foreign notification returned 404 and stayed unchanged, and a previously issued token was denied after suspending the provider. The account was restored immediately. |
| Idempotency and atomicity | `guide-runs/provider-settings-guarantees-local-latest.json` and the GUIDE-18 report | Repeated notification reads preserved one timestamp. An injected durable-audit failure rolled back both settings and audit; retry wrote once; concurrent updates from the same version produced one success and one conflict. |
| Cleanup | Both reports | Provider settings and notification read markers were restored exactly; temporary notifications, sessions, auth-session audits, settings audits, and the isolated guarantee database were removed. |

## Applicability

Notification reads and provider-owned contact settings are self-service operations, so an administrative decision reason is not applicable. Notification reads remain idempotent. Settings use optimistic versioning and a transactional audit with rollback.

## Remaining global work

GUIDE-18 remains `PARTIAL` globally until independent Figma acceptance, the final project-wide quality gate, and Production verification are complete. Production remains deferred while the project stays in Demo mode.

No Production launch or Demo purge was executed.
