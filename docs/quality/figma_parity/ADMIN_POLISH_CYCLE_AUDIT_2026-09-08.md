# Admin polish and cycle audit

## Verified changes

- The generic `[data-state]` card rule no longer constrains admin screens to 48rem. Audit and notifications now use the full admin shell width.
- Settings editors fill their content column; bilingual fields use two equal columns with bounded inputs.
- Advertising metrics use a padded responsive grid instead of content-sized flex cards.
- Sidebar scroll brings the current link into view, and the active group cannot be collapsed. Other group preferences remain persistent.
- Browser geometry verification passed for eight named routes in six device/locale configurations (48 route visits). Checks cover screen width, horizontal overflow, active link identity, desktop sidebar visibility, and advertising card overlap. Screenshots were inspected for audit and ad requests.
- The final sequential admin layout, sidebar, and ad scheduling matrix passed 36/36 across Desktop, Tablet, and Pixel 5 in Arabic and English. The final Web Vitest suite passed 412/412. These are local checks and remain distinct from post-deployment evidence.

## Source and guide recovery

- The user supplied Figma file `0HBdTNGROmmpC6S7OYa3iJ`, responsive page `6017:4357`. Direct metadata includes 62 top-level objects, including 402px mobile and 1024px tablet designs. The earlier missing-responsive-source conclusion applied to a different file and must not be retained as a current global blocker.
- `USER_GUIDE_CONFORMANCE_MATRIX.json` now references the actual HTML guide, with 26 extracted journeys and explicit references for 121/131 screens. Mapping is not completion verification; ten screens have no explicit guide reference.

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

The local fixes have not been deployed because this workstation has no authenticated GitHub push session or VPS SSH key. The Production observations above describe the currently deployed revision, not the local candidate. Do not interpret the green local tests as an exhaustive Figma parity approval.
