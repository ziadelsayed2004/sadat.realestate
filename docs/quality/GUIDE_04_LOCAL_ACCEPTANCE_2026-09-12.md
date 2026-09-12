# GUIDE-04 local functional acceptance — 2026-09-12

## Reviewed scope

GUIDE-04 covers seeker registration from role selection through email OTP, account details, the success screen, authenticated dashboard entry, and logout. The evidence uses the real local browser, HTTP API, MailHog, and MongoDB without mocked routes.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Successful browser registration | `guide-runs/registration-browser-local-latest.json` | A new seeker completed email OTP and account creation in an English Pixel 5 browser. The API returned 201, the success screen rendered, the authenticated seeker dashboard loaded, and the page had no horizontal overflow. |
| Responsive validation and retry | `guide-runs/registration-recovery-local-latest.json` | Arabic and English Desktop, Tablet, and Pixel 5 runs blocked empty and mismatched-password forms without registration mutations. An offline OTP request recovered through the real API without document navigation or overflow. |
| Role and session enforcement | Browser evidence | A current seeker session received 403 on an administrator endpoint. Logout returned 200 and the same refresh session then returned 401. |
| One-time and duplicate protection | `guide-runs/registration-guarantees-local-latest.json` | Replaying a consumed grant was rejected. A new grant for an existing email returned `SEEKER_ALREADY_EXISTS`; the grant remained verified and no duplicate account was written. |
| Transactional registration | Guarantee evidence | User, seeker profile, credential, session, and grant consumption run in one MongoDB transaction. A forced credential-write failure rolled back the grant, user, and profile. |
| Persistence and cleanup | Both current runs | The success case observed one user, profile, credential, and session. All isolated or browser-created records were removed; every residue count is zero. |

## Applicability

Horizontal access, `expectedVersion`, and a decision reason do not apply to this creation flow. The one-time grant is bound to one normalized email and the seeker role, and registration has no pre-existing owned object or approval transition. Transaction rollback, duplicate protection, role authorization, and current-session invalidation are applicable and evidenced.

## Remaining global work

GUIDE-04 remains `PARTIAL` globally until independent Figma acceptance, the final project-wide quality gate, and Production verification are complete. Production remains in Demo mode and requires explicit user approval.
