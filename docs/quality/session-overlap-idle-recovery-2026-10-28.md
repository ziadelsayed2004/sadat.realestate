# Session overlap and idle recovery — 2026-10-28

## Faults corrected

- Concurrent refresh requests previously created two replacement sessions. The losing compare-and-swap revoked every session for the account, including the winner. A second request arriving just after rotation had the same destructive outcome. The browser then cleared its cookie and broadcast logout to other tabs.
- Initial restoration during a temporary outage entered an error state with no automatic retry. The overview loader also lacked the authenticated request retry used by other administration pages.
- A response from a refresh started before a new login could clear that newer login because storing a new session did not advance its generation.

## Resulting behavior

- A consumed token never receives credentials. During the bounded 30-second overlap window the API returns `409 SESSION_REFRESH_CONFLICT` and `Retry-After: 1`, preserving the winning cookie and session. The loser removes only its unused replacement record. Older replay still triggers the existing session revocation policy; explicit logout/revocation remains invalid. This preserves refresh rotation and replay protection described in [RFC 9700, section 4.14](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14).
- The client retries that specific conflict with the current shared cookie, retaining its existing Web Lock and per-client request coalescing. A small `keepalive` refresh request can complete across document navigation.
- Temporary restoration failures automatically retry after 15 seconds, and focus/online/visibility resume can recover sooner. They do not broadcast logout. A successful new login invalidates older in-flight responses.
- Administration overview retries an expired authorized request once after refresh, with the new header. Permission failures are not retried as authentication.

## Validation

- Auth repository/service/router tests cover the concurrent winner, orphan cleanup, recent overlap without credentials, older replay, explicit revocation and the HTTP cookie boundary.
- Auth client tests cover explicit/remote logout and a late invalid response after a newer login. Renewal tests cover all account roles, initial outages, retry, idle/focus recovery and conflict handling. Overview tests verify the new request header after expiration.
- Real MongoDB/browser check: a uniquely named `sadat_session_qa_*` database on loopback only, real authentication runtime, RBAC, account guard, HttpOnly cookies and overview API. Chromium and WebKit each passed concurrent refresh (200 + 409, one active session), two tabs with repeated navigation, a real expired JWT rejected with 401 before recovery, successful focus restoration without login, and explicit logout followed by rejected refresh. Database and owned test services were removed afterwards. Ignored evidence: `.local/session-idle-real/result.json` and screenshots.
- Type checks, lint and production client/server build passed before the final guarded push. Existing bundle limits are unchanged.

Deploy with the normal production update. Existing sessions already revoked by the previous code cannot be resurrected; those users sign in once after deployment. No production sessions, credentials, cookies, data or security settings were edited from this workspace.
