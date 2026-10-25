# Production readiness follow-up — 2026-10-24

Scope: owner request covering organization/project imagery, delivery status, property plans, views, reporting, sessions and project-linked units. No production deletions, account conversions or test reports/messages against real users.

- [x] Mobile company image spacing/border and profile balance.
- [x] Partial infrastructure delivery option across contracts/API/provider/admin/public/comparison; finishing remains separate.
- [x] Working and clearly explained PDF floor-plan handling.
- [x] Visible view counters on phone cards and improved desktop results.
- [x] Correct office/developer labels and directory explanation.
- [x] Office-owned unit lookup and available-unit navigation.
- [x] Discoverable property reporting and correct administrative workflow.
- [x] Refresh/session audit and meaningful concurrent-tab/background/network tests.
- [x] Owner-selected cover/contain image presentation for company/project imagery.
- [x] Immediately available owner-project selection, optional association, project-context defaults.
- [x] Project units separated from standalone company units; project labels on cards and comparison.
- [x] Updated admin, staff, developer, office, broker and seeker guides; real local browser verification.

Initial confirmed findings: delivery enum has three choices and no partial infrastructure value; project picker loads only when its details panel opens; organization profile hydration currently combines standalone and project-linked properties; PDF floor plans require separate inspection from image/video rendering.

Verified fixes and evidence:

- `guide-runs/production-followup-local-latest.json`: PASS_LOCAL, 19 check groups, Chromium and WebKit at 390/820/1440 px, real local Mongo/API and media storage, zero captured page errors, fixture cleanup completed. The authentication harness serves HTML only; API responses are not mocked.
- Office hydration previously returned a reduced profile before loading published properties. It now resolves account/profile ownership aliases and published, active, unexpired units while retaining subscription/approval checks and contact privacy. Offices retain their account type.
- PDF documents were incorrectly sent through image/video renderers. Public details now opens/downloads the PDF; administration retrieves it with authorization, including one session-renewal retry.
- Reporting now has a public details form. Its specific authenticated route runs before provider-only router guards, and only existing published active targets accept reports. Real seeker submission, duplicate rejection, missing target rejection and administrative review all passed.
- Refresh rotation previously invalidated other tabs' unexpired access JWTs. Account access now follows the same-user replacement chain to a live session, with bounded traversal and expiry/current-account checks. Logout, session revocation and old-refresh replay still revoke access. Refresh/logout share the browser lock; late responses cannot restore a cleared/disposed session.
- Owner project references are checked inside the write transaction on create and changes, rather than trusting the dropdown. Provider projects list immediately and project entry links preselect the correct named compound.
- Explicit full-image presentation uses the original organization image; automatic legacy padding removal must not trim a new owner-selected full-image cover. Both fit modes preserve the stored original.

Delivery uses the normal protected push hook (lint, typecheck, complete tests/build/budgets). The pushed revision is identified in git history and the final delivery message; production deployment is separate.

Production observation, read-only on 2026-10-25: homepage and the supplied developer API returned 200; the supplied office slug returned 404 before this delivery. No private production status or subscription was inspected or changed. If that office remains unavailable after deployment, its saved slug, approval/directory status and identity-subscription eligibility need checking in administration; CSS cannot restore an unavailable record.

Regular server update, without seeding or deleting content:

```sh
cd /root/sadat-release &&
git pull --ff-only origin main &&
sudo bash deploy/native/manage-production.sh update
```

The old site serves during the build; activation includes a short service restart. This is not a zero-downtime deployment. The reviewed trial-content cleanup workflow remains separate and was not run against production.
