# Admin polish and cycle audit

## Verified changes

- The generic `[data-state]` card rule no longer constrains admin screens to 48rem. Audit and notifications now use the full admin shell width.
- Settings editors fill their content column; bilingual fields use two equal columns with bounded inputs.
- Advertising metrics use a padded responsive grid instead of content-sized flex cards.
- Sidebar scroll brings the current link into view, and the active group cannot be collapsed. Other group preferences remain persistent.
- Browser geometry verification passed for the named admin layout, sidebar, and filter routes in six device/locale configurations; the final matrix passed 60/60 across Desktop, Tablet, and Pixel 5 in Arabic and English. Checks cover screen width, horizontal overflow, active link identity, compact-rail active-link visibility, and filter recovery. These are local checks and remain distinct from post-deployment evidence.
- The final Web Vitest suite passed 413/413. The API route suite passed 112/112, the full API suite passed 556/556 before the final source-only sidebar change, and the contract audit reports 187/187 runtime/policy routes covered by the implemented blueprint.
- The aggregate `quality` command still has two declared release-gate exceptions: API coverage is 78.23% lines / 79.88% functions versus its 80% thresholds, and the pack audit retains the ADM-54 design-source path mismatch. All 556 API tests themselves pass; these are coverage/provenance gates rather than failing behavior assertions.

## Source and guide recovery

- The user supplied Figma file `0HBdTNGROmmpC6S7OYa3iJ`, responsive page `6017:4357`. Direct metadata includes 62 top-level objects, including 402px mobile and 1024px tablet designs. The earlier missing-responsive-source conclusion applied to a different file and must not be retained as a current global blocker.
- `USER_GUIDE_CONFORMANCE_MATRIX.json` now references the actual HTML guide, with 26 extracted journeys and 131 rows. Seven source references are inferred and remain pending cycle verification; mapping is not completion verification and does not support a 100% parity claim.
- ADM-18 was recovered as exact node `6017:69276` at 1577 × 944. A fresh local runtime capture at the same dimensions produced a 39.7325% material pixel difference, driven by the opposite sidebar placement plus heading, filter, table-density, and populated-state differences. The supplied Production examples use the current right-side RTL shell while the recovered source uses a left-side Arabic shell, so no shell rewrite or parity closure is claimed without a final product-authority decision.

## Advertising lifecycle closure

- Provider advertising drafts can now be submitted through `POST /provider/ads/:adRequestId/submit`. Persistent requests are owner-scoped and transition atomically from `draft` to `review` using the expected version.
- Administrators can approve a submitted request for pricing or reject it through `POST /admin/ad-requests/:adRequestId/review`. The action requires `admin:ads.price`, a reason, and the expected version; the UI exposes the action only for requests under review.
- A request in `waiting_pricing` now exposes the manual quote form in the admin detail screen. The client validates the complete quote contract, sends only the path-scoped request body, and reloads the request after issue.
- The journey inventory now orders draft creation, provider submission, administrative review, quote issue and acceptance, proof upload and review, and scheduling. OpenAPI and Postman contain both new routes and pass their validators.
- The missing schedule action is now wired from the ad request detail to POST `/admin/ad-requests/:adRequestId/schedule`, using the current version and reloading the detail after success. Errors remain visible without claiming the request was scheduled.
- Persistent scheduling now checks an active, clean, approved payment proof for the same request and provider inside the scheduling transaction, before writes. A repository-boundary negative test proves an unpaid request cannot write a schedule. The focused API suite passed 12/12.
- The scheduling browser test exercises the real UI/data adapter with intercepted API responses. Paid request scheduling is a calendar workflow and remains separate from the existing CMS banner publishing workflow; it does not claim that an ad request contains banner media or a public target URL when those fields are absent from its contract.

## Production read-only audit

- The supplied Production account authenticated as `ADM-01`; it was not inferred from login success. All 51 sidebar routes were opened on Desktop and all 51 on Pixel 5 without an access-denied projection.
- All 102 HTML route visits returned 200 with no horizontal overflow or failed network requests. Pixel 5 reported `window.innerWidth = 393`, `screen.width = 393`, and `documentElement.clientWidth = 393` on every route.
- `/api/v1/admin/properties`, property categories, and property reports returned 200. This verifies the deployed property projection after the `paymentPlans` compatibility guard.
- Production still runs the pre-change article contract: `/api/v1/admin/articles?sort=updatedAt...` returned 400. The local contract accepts `updatedAt`; post-deployment recheck is required.
- Platform, contact, and SEO settings returned the intentional `SETTINGS_NOT_FOUND` 404 and the UI displayed the create-at-version-zero state. No stored values were fabricated during the read-only audit.

The reviewed candidate is pushed to `main` with the compact-rail fix, advertising contract inventory, and QA handoff updates, but it has not been deployed because this workstation has no VPS SSH key or authenticated Hostinger control session. GitHub CI could not start its runner because the repository account is locked by a billing issue; this is an infrastructure failure rather than a test result. The Production observations above describe the currently deployed revision, not the pushed candidate. Do not interpret the green local tests as an exhaustive Figma parity approval.
