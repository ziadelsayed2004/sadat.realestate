# Provider deactivation requests in administration — 2026-10-14

Pending deactivation requests were persisted on the property and counted inside the general property-review attention queue. The administrative entry point did not distinguish them from publication submissions, leaving them difficult to find, especially after reading a badge.

The notification center and bell now expose a distinct `property-deactivation` attention queue under `admin:properties.manage`, linking to `/admin/properties/review?deactivationStatus=pending`. `property-review` retains publication submissions under review permission. Property navigation combines the two counts without duplicating requests. A permanent link in property-list/review headings provides access after unread receipts are cleared. The new list filter restricts persisted pending requests on published active properties before pagination and counting and is retained when searching. Existing row actions open the exact request for approval/rejection. Detail reads acknowledge only the current administrator's item and revision in the appropriate queue.

Existing pending requests are selected from their saved state, requiring no resend or data migration. Approval still hides the property; rejection leaves it public. Decision authorization, reasons, version checks and audit behavior are unchanged.

Validation:

- 33 targeted API tests passed, including permission-scoped queue reads/acknowledgements and matching row/count filters with search, provider scope and paging.
- 39 targeted UI tests passed across administrative properties, attention and provider deactivation.
- Workspace typecheck, OpenAPI validation and production build passed. The distinct queue, localized entry points and retained query add 971 bytes to the previous JavaScript total. The aggregate budget increases by a bounded two KiB; per-chunk and stylesheet limits are unchanged.
- Real local browser/API/MongoDB journey, without mocked responses: Arabic at 1440/390px and English at 390px. A provider submitted a request, its dedicated administrator alert increased, the notification link selected the correct pending property, and the reason was visible on the action form. Reading cleared only the administrator's badge while retaining the pending item. Rejection preserved publication; approval hid the property and removed the item from the pending list.
- A separately seeded older pending request was discoverable without resending. Ordinary review records, unrelated published properties and hidden records were excluded from this list. Screenshots of the mobile queue and request card were inspected.
- Synthetic properties, users, roles, sessions, receipts and audit entries were removed. No production request was read or changed and no production deployment was performed.

Evidence: `.tmp/deactivation-delivery-real/result.json`, screenshots in the same directory, `.tmp/deactivation-delivery-api.log`, `.tmp/deactivation-delivery-web.log`, `.tmp/deactivation-delivery-types.log`, `.tmp/deactivation-delivery-artifacts.log`, and `.tmp/deactivation-delivery-local.log`.
