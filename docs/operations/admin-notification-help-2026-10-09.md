# Administrative notification center — 2026-10-09

The page now explains the distinction between permission-scoped unread review queues and messages addressed to the authenticated administrator. Provider notifications, including commission changes, belong to the provider inbox. Read receipts acknowledge viewing; they do not approve, reject or close a workflow record.

The existing API attention source counts unread actionable submissions across verification, properties, projects, requests, advertising, payment proofs and reports. The direct-message list may be empty even while review queues contain items. Queue counts depend on the administrator's permissions and previous read receipts, so an empty notification center is not a complete list of pending work.

Added an explicit Refresh notifications action, context-aware empty-state guidance, and refresh of the navigation bell after acknowledging messages. Loading failures display recovery controls instead of empty-inbox wording or stale queue counts. No synthetic messages or production data were created. Live account data could not be inspected through the unauthenticated web tool.

Validation on an isolated checkout of the staged release:

- 7 web unit tests passed.
- 14 existing API attention and notification service tests passed.
- 18 browser checks passed across Arabic/English desktop, tablet and mobile: empty inbox with review queues, arrivals after refresh, mark-read behavior, filter recovery and service-error recovery.
- 2 additional Arabic screenshot checks passed; desktop and mobile layouts were inspected.
- Web TypeScript, ESLint and production build passed.

After pulling main, production deployment remains manual:

```bash
cd /root/sadat-release
git pull --ff-only origin main
bash deploy/native/manage-production.sh update
```
