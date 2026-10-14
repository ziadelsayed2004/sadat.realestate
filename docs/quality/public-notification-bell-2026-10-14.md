# Public header notification count

The homepage/public header bell now combines unread administrative messages with the same authorized review-queue total used inside administration. Provider and seeker badges continue to count their own unread messages only. It remains a direct link to the current role's notification page.

The bell subscribes to restored/changed authentication, clears previous-account counts immediately, ignores stale responses, and retries once using the refreshed token after a 401. Periodic/focus/visibility refresh uses the current session instead of a captured expired token. A transient network failure retains the last verified count; unauthorized responses remove it. Guest visitors have no private inbox bell.

Validation: targeted component tests cover all roles, administrative queue totals with an empty message inbox, token renewal, initial session restoration, account switching, polling, reading and network failures. Typecheck and production build passed with the existing asset budgets. The normal pre-push checks validate the committed snapshot.

A real local Mongo/API/browser run without mocked responses passed for admin/provider/seeker accounts at Arabic 1440px and 390px and English 390px. Each visible badge matched the real notification API, fit the header, and opened the correct inbox containing the synthetic message. Actual read calls cleared unread messages, while administrative review alerts remained counted. Guest visibility was checked separately. Synthetic accounts, credentials, profiles, roles/assignments, notifications, review request, sessions and receipts were cleaned up.

Evidence: `.tmp/public-bell-real/result.json`, screenshots in that directory, and `.tmp/public-bell-tests.log`. No production accounts/data were modified and no production deployment is claimed.
