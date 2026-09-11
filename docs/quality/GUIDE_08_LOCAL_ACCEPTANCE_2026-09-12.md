# GUIDE-08 local acceptance review — 2026-09-12

Scope: save published properties as an authenticated seeker, review and remove owned favorites, and navigate to detail and comparison. This is a local functional review, not Figma acceptance or Production verification.

| Requirement | Evidence | Scope and conclusion |
|---|---|---|
| Save from detail and navigate through saved/detail/listing/comparison | `guide-runs/saved-navigation-local-latest.json` | PASS: fresh browser save (HTTP 200 + Mongo record) and onward navigation, AR/EN on all three sizes; older save evidence superseded. |
| Truthful empty list | `guide-runs/saved-empty-local-latest.json`, `saved-remove-recovery-local-latest.json` | Empty fixture and actual removal to empty; AR/EN across three device sizes. |
| Pagination and deletion of last item on last page | `guide-runs/favorites-pagination-local-latest.json`, `saved-pagination-browser-local-latest.json` | Real Mongo filtering/count plus real browser 20/1 to 20-item first page. |
| Read and remove network recovery | `guide-runs/saved-pagination-browser-local-latest.json`, `saved-remove-recovery-local-latest.json` | No mutation while offline; retry succeeds and updates stored state. |
| Duplicate save, malformed input, unavailable property | `guide-runs/favorites-access-http-local-latest.json` | HTTP + isolated Mongo; duplicate save retains one record, malformed input 400, unavailable save 404. |
| Ownership, roles, current account state | `guide-runs/favorites-access-http-local-latest.json` | Foreign list/remove isolation; non-seeker/anonymous denied; old claims denied after account changes. Locally signed tokens, not login lifecycle. |
| Logout session invalidation | `guide-runs/favorites-logout-local-latest.json` | Full runtime and real login/logout; old token GET/PUT/DELETE all 401. |
| Property becomes unavailable after render | `guide-runs/saved-remove-recovery-local-latest.json` | Inactive property excluded from fresh API read; already-rendered card remains removable. |
| Arabic/English and responsive overflow | Browser evidence above | Six combinations including Pixel 5 width 393; does not prove Figma measurements or pixel parity. |
| Internal projection fields | `apps/api/tests/security/public-projections.test.ts` and repository projection | Explicit allowlist inspected. Existing focused test passed after service signature update; not a new runtime leak audit. |

Applicability: favorite save/remove has no client version or moderator decision reason. The matrix's generic expectedVersion409/decisionReason/atomicAuditRollback fields are not acceptance criteria for these idempotent endpoints. Their applicability must not be confused with untested moderation features in other journeys.

Source review: latest functional changes are `094f5d3` (current account), `d38b8b4` (pagination total/filtering), `89fb7b7` (valid page after removal). Subsequent application sources unchanged through `66e8aee`; later commits add verification/documentation. Early registration-linked favorite evidence remains historical; fresh save execution supersedes it for current local acceptance.

Remaining outside this local review: Production execution on deployed revision; independent Figma SEK-06/PUB-03/PUB-04 acceptance; final project-wide quality gate. Demo purge and launch remain postponed by owner. No claim of global journey closure or goal completion.
