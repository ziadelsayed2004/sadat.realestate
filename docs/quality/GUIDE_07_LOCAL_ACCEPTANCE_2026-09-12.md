# GUIDE-07 local acceptance review — 2026-09-12

Scope: a Seeker creates and manages property viewings, a Provider performs permitted appointment transitions, and the Seeker sees the resulting state. This is a local functional review; it is not Figma acceptance or Production verification.

| Requirement | Evidence | Scope and conclusion |
|---|---|---|
| Seeker create, reschedule and cancel | `guide-runs/guide-04-local-latest.json` (`viewingJourneyEvidence`) | PASS through the real browser/API/MongoDB flow; cancelled state is read back in the Seeker UI. |
| Provider confirm, reschedule, complete and cancel | Same evidence | PASS through provider browser controls; completion/cancellation is read back by the Seeker. |
| Mandatory cancellation reason | Same evidence | PASS: provider cancellation is blocked until a reason is supplied. |
| Empty state recovery | Same evidence | PASS: empty tabs recover without a document refresh. |
| Offline read recovery and responsive containment | `guide-runs/seeker-viewings-recovery-local-latest.json` | PASS in AR/EN on Desktop/Tablet/Pixel 5; retry returns HTTP 200 without navigation or overflow; viewings remain unchanged and sessions are cleaned. |
| Ownership and legacy account links | `guide-runs/request-guarantees-local-latest.json` | PASS: only the linked Seeker can read/act on current and legacy-profile-owned viewings. |
| Current account state and Provider permission | Same evidence | PASS: the acting account must remain active and carry the relevant permission at request time. |
| Slot collision and reuse | Same evidence | PASS: competing active bookings return one 201/one 409; cancelled slots become bookable; occupied reschedule returns 409 without mutation. |
| Validation | Same evidence | PASS: past reschedule and missing/empty/whitespace/short cancellation reasons are rejected without writes. |
| Version conflict and atomic audit | Same evidence | PASS: concurrent confirmation yields one 200/one 409; forced audit failure rolls back both the viewing mutation and audit entry. |

The broad GUIDE-04 evidence intentionally retains its named local QA account as documented by that verifier. The focused recovery verifier creates no viewing mutations and confirms its new sessions are cleaned; this review does not delete pre-existing Demo/QA fixtures.

Remaining outside this local review: Production execution on the deployed revision; independent Figma acceptance for SEK-05 and related Provider screens; final project-wide quality gate. Demo purge and launch remain postponed by the owner.
