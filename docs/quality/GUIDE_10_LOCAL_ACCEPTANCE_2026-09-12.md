# GUIDE-10 local functional acceptance — 2026-09-12

## Decision

The local functional scope for seeker profile, search preferences, account settings, and owned-session revocation is reviewed. GUIDE-10 remains `PARTIAL` until Production verification, independent Figma acceptance for SEK-08/09/10, and the final project-wide quality gate are complete.

## Reviewed evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| Profile and preference success, validation, empty state, and offline retry | `guide-runs/seeker-account-local-latest.json`, `guide-runs/seeker-save-recovery-local-latest.json`, `guide-runs/seeker-account-state-local-latest.json` | Passed with real browser/API/MongoDB coverage across Arabic and English on Desktop, Tablet, and Pixel 5 where the browser flow applies. |
| Current account state and role authorization | `guide-runs/seeker-account-state-local-latest.json` | Suspended/rejected accounts return 403; changed/deleted identities return 404; provider/admin tokens return 403; denied operations leave the profile unchanged. |
| Concurrent and repeated preference writes | `guide-runs/seeker-account-state-local-latest.json` | Concurrent disjoint writes preserve both fields; identical replay is stable; one profile document remains. |
| Cross-collection profile atomicity | `guide-runs/seeker-account-state-local-latest.json` | A forced profile write failure returns 500 and rolls back both the user locale and seeker profile changes. |
| Session listing and owned-session revocation | `guide-runs/session-revocation-local-latest.json`, `guide-runs/session-browser-local-latest.json` | Seeker, provider, and admin ownership rules pass; current-session revocation returns 409; foreign/repeated revocation returns 404; the revoked token is denied while the current session remains usable. |
| Session audit atomicity | `guide-runs/session-revocation-local-latest.json` | A forced audit failure returns 500, leaves the target session active, and leaves the audit count unchanged. |
| Cleanup | Both isolated MongoDB verifiers | Temporary databases were dropped and report `cleanup: true`. Demo/QA data was not modified. |

## Contract applicability

- `expectedVersion`/409 is not applicable to the idempotent self-service profile and preference field updates because these endpoints do not expose a versioned workflow transition contract.
- A user-supplied decision reason is not applicable to self-service edits. Session revocation records its audit reason on the server.
- The applicable atomic audit rollback requirement is verified for session revocation. Cross-collection profile rollback is recorded separately as an atomic write guarantee.

## Remaining scope

- Verify the journey in Production after an explicitly approved deployment.
- Complete independent Figma acceptance for SEK-08, SEK-09, and SEK-10.
- Run the final project-wide quality gate when the remaining journey and Figma work reaches closure.

No Production launch or Demo purge was executed.
