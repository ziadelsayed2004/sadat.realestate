# Provider and admin follow-up goal — 2026-10-15

All user-reported items are tracked here. Completion requires a concrete change
or verified explanation, relevant local validation, and pushed commits. Server
deployment remains with the operator; production data is not test data.

- [x] Default category/type image when no owner image exists; preserve uploaded
  images. Commit `9b05309a`, real browser/API/MongoDB upload/reset journey and
  homepage/listing checks pass. See `community-layout-category-template-2026-10-15.md`.
- [x] Simplify ordering of locations rather than requiring arbitrary numbers.
- [x] Fix/explain the disabled category/type field in the taxonomy editor.
- [x] Explain advertising placement codes in ordinary Arabic and English.
- [x] Verify/fix hero and featured placements working independently, including
  scheduled banners and accidentally duplicated promotion across placements.
- [x] Notify providers when an account commission assignment changes or stops;
  existing exception notifications retained. The message explains that an
  approved exception can take priority over the saved account assignment.
- [x] Fix unnecessary repeated logins; test session restoration and refresh.
- [x] Fix password reset matching and handle unregistered email clearly.
- [x] Make category counts understandable and consistent with applied filters.
- [x] Fix/verify admin unread-new-request dashboard card and destination.
- [x] Improve hero/featured-card layout on phone and desktop. Community cards
  are already fixed and verified at 320–1920px in `9b05309a`.
- [x] Translate raw property delivery values such as `under_construction`.
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

## Final implementation checkpoint

All 15 reported items have an implementation or a verified explanation.
Code checkpoint `7cd7f8e6` passed the normal full pre-push checks and was
confirmed on remote main. Production deployment is outside this goal.

| Item | Result and evidence |
| --- | --- |
| 1: Category template | `9b05309a`: same template on home, listing and editor; supplied/scanned upload takes precedence; real upload/reset checks passed. |
| 2: Location order | Up/down buttons show sequential positions; create defaults to the end. `PUT /admin/locations/order` checks a complete list of IDs/versions and saves all changed ranks plus audits in one transaction. Sparse/tied values are handled. |
| 3: Category form | Editing shows a clear fixed-kind label rather than a disabled select. Each category has Add property type, which preselects the category in a working create form. Parent category remains editable for an existing type. |
| 4: Placement code | Removed the unnecessary technical code column and obsolete instruction to share a code with advertisers. Placement guidance now explains selecting a location, adding media, scheduling and the two independent display switches. |
| 5: Hero versus featured | Fixed HeroSection fallback accidentally selecting a `featured_` item when no hero was published. Explicit featured data stays out of the hero; managed hero and featured placement switches remain independent. Scheduled rows display only inside their time window. |
| 6: Commission notice | Account assignment activation/change/stopping creates a localized provider notice transactionally. Existing approved-exception notices remain supported. Idempotent retries do not create duplicate notices. |
| 7: Session stability | Transient refresh failures and invalid password form submissions no longer erase a valid HttpOnly refresh cookie. Access tokens also renew before expiry for all roles and on resuming an idle tab. Network failures retry while keeping the current screen. Invalid/replayed/revoked sessions still clear the cookie; explicit logout clears it even during a revocation outage. Three real provider tabs survived three parallel full reloads: nine successful rotations and one live session. |
| 8: Password recovery | An unknown/deleted account cannot create a recovery challenge or receive a code. A clear no-account message links registration. Password mismatch, password strength, expired grant and service failures have distinct feedback. Real SMTP/browser reset passed; the new password works and old password fails. |
| 9: Category counts | Rail counts now say Total and explicitly describe all published properties before filters. Matching search count, including zero, is separate. Real 2,000,000-EGP property remained in its type total while the 1,000?20,000 query correctly returned zero. |
| 10: Admin request card | Dashboard loads with a real admin. Aggregate unread request card now opens Notifications, which contains contact, viewing, search and customer queues; its previous Requests destination omitted viewing requests. A new request increments the badge; reading clears it without changing workflow status. |
| 11: Responsive home | Replaced conflicting fixed-height featured CSS with a content-sized layout: media beside copy on desktop and above on phones. CTA stays inside; long copy wraps. Hero grid/search shrink within the viewport, including long headings. |
| 12: Delivery | Details map all three delivery enums to existing localized labels. No raw `under_construction` or `future_delivery` is displayed. |
| 13: Override versus exception | Both account history and exception creation explain precedence: approved exception, then account assignment, then policy. Exception creation explains approval and temporary special agreements. |
| 14: Cancel saved commission | Archived history plus audit is retained, stale versions/cross-account access rejected, and a fresh assignment can reuse the same start date. |
| 15: Reporter notice | Resolving/dismissing a community report creates a private notice for its seeker/provider reporter in the same transaction. Internal resolution reasons are excluded. |

### Local verification

- `scripts/verify-location-order-local.mjs`: PASS_LOCAL on a disposable QA
  database at port 27018. Sparse/tied orders become sequential; incomplete and
  stale lists fail; an injected audit failure rolls back every changed row.
  Names, hierarchy, active state and record count remain unchanged. Cleanup passed.
- `scripts/verify-account-report-notifications-local.mjs`: PASS_LOCAL, covering
  the legacy unique-index migration, cancellation/replacement, deterministic
  notices and transaction rollback for assignments and both reporter roles.
- `.tmp/auth-recovery-real/result.json`: PASS_LOCAL with real local SMTP,
  challenge verification, browser form errors and subsequent password login.
- `.tmp/session-repeated-real/result.json`: PASS_LOCAL for simultaneous tabs,
  cookie rotation and full page reloads; no mocked responses.
- `.tmp/session-renewal-real/result.json`: PASS_LOCAL. Accelerating only browser
  time to the renewal deadline triggers a real API cookie rotation for admin
  and provider. An unsaved administrator form stays open with its draft intact.
  Unit tests cover all three roles, transient failure/retry, idle-tab resume,
  logout and disposal. The same real-API renewal journey also passed on WebKit
  (Safari engine), with no mocked responses.
- `.tmp/goal-remaining-real/result.json`: PASS_LOCAL with real APIs, browser,
  uploads and MongoDB. Covers location reorder/reload, category-to-type creation,
  filtered results, Arabic delivery, admin counts and independent promotions.
  Scheduled hero visibility, disabling only one placement and future starts
  were verified. Local settings/placements/orders were restored after the run.
- Screenshots of featured cards and hero/search were inspected at 320, 390,
  768, 1024 and 1440 pixels in Arabic/English. Geometry checks include heading,
  search and action bounds; all pass without horizontal clipping. A first
  visual review caught a narrow-screen hero overflow that was fixed and rerun.
- Targeted Playwright banner layout checks pass on mobile-ar and desktop-en.
  The fixture now explicitly declares hero/featured presentation like the live
  API. The test verifies content fits after carousel navigation without
  requiring the old fixed-height blank space.
- API tests cover authentication, management permission, strict reorder input,
  stale versions, replay, cross-account cancellation and recovery delivery.
  Frontend tests cover both locales, type creation, reorder, counts, translated
  delivery, distinct recovery errors, history and view-only access.
- OpenAPI, Postman and contract audit pass with 243 implemented routes.
  Workspace tests pass. Full lint/typecheck/test run is enforced by the normal
  push hook; the hook is not bypassed.

The verified code checkpoint `7cd7f8e6` built 2,616,011 JavaScript bytes and 260,316
bytes for the public route stylesheet.
The JS ceiling is a bounded 2,616,320 bytes; chunk and stylesheet ceilings are
unchanged. Replacing the conflicting featured CSS removed 11,042 route bytes
net after the hero containment fix. Final build metrics are also printed by
`check-bundle-budget.mjs` in every release/push build.

### Completed release checks

`7cd7f8e6` passed lint, typecheck, 27 workspace checks, 877 API tests,
1,074 frontend Vitest tests in 101 files, and 90 frontend Node/SSR tests.
The normal push hook reported `PUSH_CHECK_OK`; remote main matched the checked
commit. No checks were bypassed.

The last visual check also verified the category-count explanation fits inside
the listing introduction at 360px Arabic and 1440px English, without clipping.
All 15 items above are complete. This checkpoint records these results and
removes the last obsolete instruction about sharing placement codes.

No production deployment or production-data modification has been made.
