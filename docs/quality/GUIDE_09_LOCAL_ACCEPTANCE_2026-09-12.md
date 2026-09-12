# GUIDE-09 local acceptance — 2026-09-12

## Decision

`GUIDE-09` is `LOCAL_FUNCTIONAL_SCOPE_REVIEWED`. Its global journey status remains `PARTIAL` until independent Figma acceptance, the final project-wide quality gate, and an explicitly authorized Production run are complete.

## Evidence reviewed

- `docs/quality/guide-runs/notification-recovery-local-latest.json`: six real authenticated browser runs, Arabic and English on Desktop, Tablet, and Pixel 5. Offline filter loading reaches the retry state and recovers through the real API without document reload or horizontal overflow. Every browser-created session was removed.
- `docs/quality/guide-runs/seeker-notifications-guarantees-local-latest.json`: real HTTP against an isolated MongoDB replica-set database. It proves ordered safe projection, seeker/audience scoping, 401/400 validation boundaries, foreign-recipient 404 isolation, provider/admin 403 denial, single/read-all transitions, the unread empty state, stable replay, concurrent duplicate safety, and cleanup.
- `docs/quality/guide-runs/seeker-account-local-latest.json`: earlier real browser/API/MongoDB evidence for the visible single-read and mark-all interaction states was reviewed as supporting presentation evidence; it was not rerun.

## Security and state guarantees

Notification access now verifies the live user role/status and the access token's live session. A token is denied after account suspension, role change, session revocation, session expiry, or session deletion. Denied operations leave notification records unchanged.

Marking an already-read notification is idempotent: sequential and concurrent repeats return the first stored `readAt` instead of rewriting it. Read-all only changes unread seeker-audience rows for the authenticated recipient and returns zero on replay.

## Applicability

Optimistic `expectedVersion`, administrative decision reasons, and audit rollback do not apply to recipient-owned notification read flags. This operation is a self-service idempotent state marker and is not an approval transition. Authentication/session auditing remains governed by the separate session contract.

## Remaining global gates

- Independent Figma acceptance for the mapped seeker notification screen.
- The final project-wide quality gate after the remaining journeys are reviewed.
- Production verification only after explicit user authorization; no launch or purge was executed.
