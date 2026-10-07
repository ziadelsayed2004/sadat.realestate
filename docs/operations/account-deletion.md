# Administrative account deletion

Administrators with `admin:users.manage` can delete a seeker or provider from the Users list or the account detail page. View-only administrators cannot delete accounts. The confirmation identifies the target by name and email, requires a reason and explicit checkbox, and submits the current version. Cancelling does not mutate anything; a concurrent update returns 409 and requires reviewing the fresh account.

`DELETE /api/v1/admin/users/:userId` accepts `{ "version": 0, "reason": "Duplicate account", "confirmed": true }`.

This is deletion from operating use, with a retained tombstone rather than physical destruction of financial and request history. The account disappears from user/provider lists and their counts, cannot sign in, and all sessions are revoked. Its email stays reserved. For providers, the application/profile is suspended, organizations become inactive, and published properties/projects are hidden. Other accounts are untouched. Generic activation and application review cannot restore deleted accounts. Self and administrator targets are forbidden.

All changes and the audit entry commit in one MongoDB transaction. There are no automated email or notification side effects. No migration is needed: `deletedAt: null` also matches existing records without that field. This operation is not a privacy data-erasure procedure.

Local verification: `node --import tsx scripts/verify-account-deletion-local.mjs`, with the local QA MongoDB replica set on port 27018. It creates and removes only a uniquely named local database, verifies real HTTP authorization, version/confirmation, list counts, linked-history retention, provider content visibility, and transaction rollback when the audit write fails. Browser coverage is in `apps/web/tests/e2e/admin-account-deletion.spec.ts`.

Production changes become available after deployment. Do not delete a real customer just to verify the feature.
