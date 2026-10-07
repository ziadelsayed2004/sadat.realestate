# Advertising notifications

Advertising request approval/rejection, quotation, required payment, payment-proof review, and scheduling create provider notifications inside the same database transaction as the workflow change. The provider dashboard shows the newest three unread notifications, links to request details, and the actual unread count. It refreshes when the tab regains focus and every 45 seconds while visible. No email is sent.

Approval for pricing does not claim the advertisement is already running. Approved payment proof does not claim the advertisement has been scheduled.

## Existing requests

After deploying and building the API, preview missing notifications:

```bash
cd /root/sadat-release
node scripts/backfill-advertising-notifications.mjs --env-file /etc/elsadatrealestate/production.env
```

Apply the reviewed plan:

```bash
node scripts/backfill-advertising-notifications.mjs --env-file /etc/elsadatrealestate/production.env --apply
```

The script adds only a missing alert for each current actionable advertising stage. It skips submitted payment proof awaiting review, substitutes payment approval/rejection for an obsolete payment request, and preserves existing notifications and read receipts. Rerunning it is safe. It prints counts without account data or credentials.

## Verification

With the API built and a local MongoDB replica set available:

```bash
node scripts/verify-advertising-notifications-local.mjs
```

The verifier uses a new temporary database and removes only that database on completion. `AD_NOTIFICATION_QA_MONGODB_URI` can select a dedicated test replica set. Tests cover ownership, acceptance/payment/scheduling notifications, retries, transaction rollback, historical backfill, and read receipts.
