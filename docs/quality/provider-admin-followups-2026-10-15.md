# Provider and admin follow-up goal — 2026-10-15

All user-reported items are tracked here. Completion requires a concrete change
or verified explanation, relevant local validation, and pushed commits. Server
deployment remains with the operator; production data is not test data.

- [x] Default category/type image when no owner image exists; preserve uploaded
  images. Commit `9b05309a`, real browser/API/MongoDB upload/reset journey and
  homepage/listing checks pass. See `community-layout-category-template-2026-10-15.md`.
- [ ] Simplify ordering of locations rather than requiring arbitrary numbers.
- [ ] Fix/explain the disabled category/type field in the taxonomy editor.
- [ ] Explain advertising placement codes in ordinary Arabic and English.
- [ ] Verify/fix hero and featured placements working independently, including
  scheduled banners and accidentally duplicated promotion across placements.
- [x] Notify providers when an account commission assignment changes or stops;
  existing exception notifications retained. The message explains that an
  approved exception can take priority over the saved account assignment.
- [ ] Fix unnecessary repeated logins; test session restoration and refresh.
- [ ] Fix password reset matching and handle unregistered email clearly.
- [ ] Make category counts understandable and consistent with applied filters.
- [ ] Fix/verify admin unread-new-request dashboard card and destination.
- [ ] Improve hero/featured-card layout on phone and desktop. Community cards
  are already fixed and verified at 320–1920px in `9b05309a`.
- [ ] Translate raw property delivery values such as `under_construction`.
- [x] Explain account commission overrides versus higher-priority exceptions.
- [x] Add cancellation for saved account commission assignments, preserving
  history and allowing a replacement without ambiguous date conflicts.
- [x] Notify the reporter/client when an administrator resolves a problem.

## Existing verified work

`9b05309a` is pushed to main. Its full push checks passed: lint, typecheck,
870 API tests, 1,060 web tests and 90 Node frontend tests. No production write
was made. This covers the default category template and community-card layout,
not the remaining items above.

## Investigation and validation

The second implementation checkpoint adds versioned, permission-controlled
assignment history and cancellation. Cancellation archives the saved record,
retains its audit and permits a replacement on the same effective date. A new
partial unique index is built before removing the old stricter date index.
Archived records cannot be reactivated or edited.

Commission notices and report-resolution notices commit in the same database
transaction as their underlying action and audit. Deterministic notification
IDs prevent duplicate delivery on retries. Reporter notices exclude private
administrative resolution reasons and support seekers and providers.

Validation:

- Account HTTP tests cover version conflicts, cross-account access, strict
  cancellation inputs, retained history and same-date replacement.
- 20 targeted frontend tests pass, including reason validation and view-only
  history without mutation controls.
- `node --import tsx scripts/verify-account-report-notifications-local.mjs`
  passes on a disposable database on QA port 27018. It verifies migration from
  the old unique index, real transactions, audit-failure rollback, idempotent
  delivery, and resolution notices for both reporter roles. Cleanup passed.
- `.tmp/commission-notice-real/result.json`: `PASS_LOCAL`, no mocked responses.
  A real administrator cancels through the English desktop UI and saves a
  replacement on the same date. The provider sees commission and resolution
  notices in the Arabic phone UI. Arabic history and English cancellation
  screenshots were inspected. Synthetic records were cleaned up.
- Lint and typecheck pass. OpenAPI, Postman and API-contract audit pass with
  242 implemented routes.
- Client JavaScript is 2,608,675 bytes, an increase of 6,524 bytes from the
  preceding checkpoint. A bounded six-KiB allowance was added; the maximum
  individual chunk and route stylesheet limits remain unchanged.

The remaining checklist items are still in progress. No production deployment
or production-data modification has been made.
