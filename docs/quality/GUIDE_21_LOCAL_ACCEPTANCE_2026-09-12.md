# GUIDE-21 local functional acceptance — 2026-09-12

## Reviewed scope

GUIDE-21 covers the six request-management screens ADM-19 through ADM-24 for full and limited administrators. The evidence below uses the real local browser, API, and MongoDB without mocked routes.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Six request-management routes | `guide-runs/admin-requests-recovery-local-latest.json` | Six Arabic/English runs on Desktop, Tablet, and Pixel 5 loaded all six routes through HTTP 200 and found no horizontal overflow. |
| Empty and offline recovery | Same evidence | A no-result search clears through a 200 response, and an offline filter recovers through Retry without document navigation. |
| Browser validation | Same evidence | Empty, whitespace-only, and too-short transition reasons are blocked before POST; the request and audit collections remain unchanged. |
| Limited administrator UI | Same evidence | In both locales, assignment, note, and transition controls are absent when the live permission projection denies them. A denied screen renders its permission state. |
| Limited administrator API | Same evidence | The viewer role can read ADM-19/20/21/23, receives 403 for ADM-22/24, and receives 403 for direct transition, assignment, and note mutations. The request remains unchanged and no audit row is written. |
| Request authorization and integrity | `guide-runs/request-guarantees-local-latest.json` | Current-account checks, live RBAC revocation, ownership isolation, required decision reason, version conflicts, duplicate/replay handling, and transactional audit rollback pass against real HTTP and MongoDB. |
| Export | `guide-runs/request-export-local-latest.json` | The real built web and API export checks pass for the request-management scope. |
| Cleanup | All evidence above | The temporary request and every session created by the recovery verifier were removed. Existing Demo/QA fixtures were preserved. |

## Defect fixed during acceptance

The request detail previously rendered assignment and internal-note forms to a view-only administrator, while its transition actions were derived without the current RBAC state. The API projection now supplies explicit assignment and note capabilities, filters available transitions through the current manage permission, and the UI renders only the permitted controls.

## Remaining global work

GUIDE-21 remains `PARTIAL` globally until independent Figma acceptance for the related Admin screens, the final project-wide quality gate, and Production verification are complete. Production requires explicit user approval.

No Production launch or Demo purge was executed.
