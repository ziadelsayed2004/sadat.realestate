# GUIDE-17 local functional acceptance — 2026-09-12

## Reviewed scope

GUIDE-17 follows the provider's owned advertising requests and reads the effective commission policy. Its documented result is informational, so this acceptance does not claim the separate create, quote, payment, or administrative commission mutation lifecycles.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Responsive success paths | `guide-runs/remaining-surfaces-local-latest.json` | PRV-19 and PRV-20 passed in Arabic and English on Desktop, Tablet, and Pixel 5 with real API responses, no page errors, and no horizontal overflow. |
| Owned advertising projection | `guide-runs/guide17-provider-ads-commission-local-latest.json` | The provider received only owned advertising rows. The public projection omitted provider IDs and private quote/payment storage, filename, and hash fields. A foreign request returned 404. |
| Commission projection | Same GUIDE-17 report | The current effective commission projection loaded through the protected provider endpoint without changing requests or commission confirmations. |
| Validation and empty state | Same GUIDE-17 report | Invalid pagination returned 400. A status absent from the provider's records produced a true empty list and clearing it restored the list without document navigation in all six browser configurations. |
| Network recovery | Same GUIDE-17 report | Advertising recovered from browser offline mode and commission recovered from one aborted API read through explicit Retry controls and real HTTP 200 responses. |
| Authorization and current state | Same GUIDE-17 report | Anonymous requests returned 401, an administrator could not use provider endpoints, a foreign provider request remained hidden with 404, and a previously issued provider token was denied after the account was suspended; the fixture was restored immediately. |
| Cleanup | Both reports | Newly created sessions, auth-session audits, and the optional foreign ownership fixture were removed. Existing Demo advertising and commission records remained unchanged. |

## Applicability

The documented journey is read-only. Duplicate mutation, optimistic-write version, decision reason, and audit rollback checks are not applicable to this specific action. Those contracts remain part of the advertising/payment and commission administration journeys.

## Remaining global work

GUIDE-17 remains `PARTIAL` globally until independent Figma acceptance, the final project-wide quality gate, and Production verification are complete. Production remains deferred while the project stays in Demo mode.

No Production launch or Demo purge was executed.
