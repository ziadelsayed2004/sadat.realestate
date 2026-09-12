# GUIDE-05 local functional acceptance — 2026-09-12

## Reviewed scope

GUIDE-05 covers the authenticated seeker overview: owned summary counters, recent requests, upcoming viewings, notifications, saved-property availability, empty and error recovery, onward navigation, and access enforcement. The evidence uses real local browsers, HTTP, and MongoDB without mocked routes.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Truthful owned counters | `guide-runs/seeker-overview-counts-local-latest.json` and `seeker-overview-count-browser-local-latest.json` | Isolated MongoDB recomputation excluded foreign records and matched requests, active requests, viewings, available saved properties, and notifications. Six AR/EN Desktop, Tablet, and Pixel 5 browser runs matched the real API and had no overflow. |
| Safe recent-activity projection | `guide-runs/seeker-overview-projection-local-latest.json` | Requests and notifications use the newest three owned records; viewings use the earliest three active owned records. Totals remain independent of the three-row projection, foreign records are absent, and internal top-level fields are excluded. |
| Empty state | `guide-runs/seeker-overview-empty-local-latest.json` | A genuinely empty account returned six zero counters and three empty projections; the browser rendered four zero cards and three empty panels in all six locale/device combinations without business writes. |
| Failure and retry | `guide-runs/seeker-overview-recovery-local-latest.json` | Aborting the initial request showed a retry state without false counts. Retry recovered through real HTTP 200 without document navigation or horizontal overflow in all six runs. |
| Navigation | `guide-runs/seeker-overview-navigation-local-latest.json` | Request, viewing, notification-list, and notification-row actions opened the expected owned destinations while preserving locale across all six runs. |
| Current account, role, and session | `guide-runs/seeker-overview-access-local-latest.json` and `seeker-overview-logout-local-latest.json` | Suspended, rejected, restricted, role-changed, deleted, expired-session, and anonymous states returned 401 without exposing summary data. Provider and admin tokens returned 403. Logout invalidated the old token in all six browser runs. |
| Cleanup | All browser and isolated runs | Temporary fixtures and newly issued sessions were removed; saved records and Demo fixtures were preserved. |

## Applicability

The overview is a read-only owned aggregate. Input mutation validation, duplicate mutation handling, optimistic write versions, decision reasons, and audit rollback are not part of this route. Horizontal ownership, role authorization, and current account/session state are applicable and evidenced.

## Remaining global work

GUIDE-05 remains `PARTIAL` globally until independent Figma acceptance for SEK-01, the final project-wide quality gate, and Production verification are complete. The project stays in Demo mode and no launch or purge has run.
