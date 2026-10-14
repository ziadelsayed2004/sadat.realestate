# Staff last connection and action identity

Date: 2026-10-14

Staff lists now show online/offline status separately from the elapsed last connection and its exact Cairo timestamp, including online accounts. Successful administrative sign-in, refresh and owned live dashboard heartbeats persist a maximum activity timestamp on the user identity without updating account version or lifecycle timestamps. Retained session creation/heartbeat timestamps support legacy accounts; accounts with no retained evidence remain explicitly unknown. Durable activity survives logout and session TTL removal. An expired access token triggers one authenticated refresh/retry of the heartbeat.

Staff viewers with audit permission can open each employee's filtered action log. Authorized audit list/detail/CSV projections include the current administrative account name and email; email is also the display fallback when the name profile is missing. Provider/seeker emails are never resolved, forbidden reads perform no identity lookup, and stored before/after snapshots keep their existing redaction and immutability. The operating guide explains the workflow.

Verification:

- Targeted API tests cover durable heartbeat ownership, preservation after sessions disappear, login/refresh writes, email projection, actor-type separation and authorization before lookup.
- Targeted web tests cover Arabic/English elapsed time, timestamps while online, staff-filtered audit navigation and filter reset, name/email presentation and expired-token refresh.
- Real local Mongo/API/browser journey passed without mocked responses: two synthetic staff accounts signed in; an assigned staff editor actually changed another employee's name; the audit returned the editor's name/email and redacted snapshots. A separate authorized viewer followed the real staff action link into list/detail at Arabic 1440px/390px and English 390px. Detail pages had no horizontal overflow.
- Actual logout followed by removal of the actor's session records retained the exact last connection and reported offline. Synthetic users, roles, assignments, credentials, audit entries and test sessions were cleaned up.
- Typecheck, lint, generated-guide check and production build passed during implementation. The final committed snapshot is checked by the normal pre-push gate.

The added interface/heartbeat logic and guide require a bounded 4 KiB increment to the total JavaScript budget from the 2,587,906-byte baseline. Per-chunk and route stylesheet limits remain unchanged.

Local evidence: `.tmp/staff-real/result.json`, screenshots in `.tmp/staff-real/`, and `.tmp/staff-*.log`. No production accounts or data were changed and no production deployment is claimed.
