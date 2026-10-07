# Account list counts

`GET /api/v1/admin/users` returns an optional `summary` object with all-page counts for the selected `roleType`. It ignores the `status` filter, excludes deleted accounts and administrators, and is recalculated on every request. The existing outer `total` remains the filtered result count used for pagination.

The users/seeker screens display these summary counts plus a separate **Matching accounts** card. An empty status filter shows an empty list and zero matches without resetting the overall counts. Returning to All restores rows, including when the view began with prefetched list data.

Local verification:

```powershell
node --import tsx scripts/verify-account-counts-local.mjs
```

The verifier requires the local QA MongoDB replica set `rs0` on `127.0.0.1:27018`. It creates and removes only a uniquely named `account_counts_qa_*` database, starts an ephemeral loopback API, and checks 45 accounts across pages and role/status filters, deleted/admin exclusions, refreshes, and authentication. It does not read production configuration.

After deploying the API and web builds together, check All, Verified, an empty status, All again, and page 2 in `/admin/users?lang=ar`. Only the matching count should change with status; the role-specific overall counts should remain unchanged. No migration is needed.
