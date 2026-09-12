# GUIDE-16 local functional acceptance — 2026-09-12

## Reviewed scope

GUIDE-16 covers the provider projects list, customer-request list and create flow, and viewing work queue. The combined evidence below exercises the real local browser, API, and MongoDB without mocked routes.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Project list, create form, validation, empty state, and recovery | `guide-runs/provider-projects-recovery-local-latest.json` | Six Arabic/English runs on Desktop, Tablet, and Pixel 5 block invalid submission without POST, create and render an owned MongoDB project, clear a no-result search, recover an offline filter without navigation, and avoid horizontal overflow. |
| Customer-request list and create flow | `guide-runs/provider-customer-recovery-local-latest.json` | Six device/locale runs block an empty form without POST, create an owned request through the real API, confirm the stored payload, clear a no-result search, and recover from offline filtering without reload or overflow. |
| Customer-request API guarantees | `guide-runs/provider-customer-request-local-latest.json` | Strict validation, duplicate prevention, foreign-provider isolation, role and current-account checks, version conflict, required decision reason, persisted audit data, and forced audit rollback all preserve the expected MongoDB state. |
| Viewing transitions and validation | `guide-runs/guide-04-local-latest.json` | The real provider browser/API/MongoDB flow confirms, reschedules, completes, and cancels viewings; cancellation without a reason is blocked. |
| Viewing empty state and recovery | `guide-runs/provider-viewings-recovery-local-latest.json` | Six Arabic/English device runs select an honestly unused status, clear it through a 200 response, reach retry while offline, recover through a 200 response without navigation, and have no horizontal overflow. |
| Data integrity and cleanup | All evidence above | Temporary customer requests, projects, and new sessions were removed. The viewing collection matched its before snapshot. Demo/QA fixtures were preserved. |

## Account-type applicability

The guide names `individual_provider`, `broker`, and `developer_company`. These four routes and their API services authorize the shared `provider` role and contain no account-subtype branch. The local execution therefore reviews the common functional contract; it does not claim three separate visual fixture runs when product behavior is identical by implementation.

## Responsive defect fixed during acceptance

The fixed Pixel 5 provider navigation intercepted modal footer controls. Provider modal backdrops now sit above navigation, and the real customer-request mobile flow plus focused PRV-18/PRV-19 checks pass in both locales.

## Remaining global work

GUIDE-16 remains `PARTIAL` globally until independent Figma acceptance for PRV-15/16/17/18, the final project-wide quality gate, and Production verification are complete. Production requires explicit user approval.

No Production launch or Demo purge was executed.
