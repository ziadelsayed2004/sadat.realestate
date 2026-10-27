# Community categories, working hours and team departments — 2026-10-28

- `/admin/community`: each category has a delete action, a retained reason field, confirmation and cancellation. Both default and custom categories can be removed. Failed requests preserve the category and input for retry.
- Category retirement and audit commit in one transaction. Authorization requires `admin:community.moderate`; unauthenticated, forbidden, invalid and missing-category requests fail before mutation. Repeated removal is idempotent. Existing posts and their category labels remain available; retired choices disappear from public filters and new-post selectors. The removed name can be used for a new category.
- The public category hook broadcasts successful mutations to mounted selectors and prevents an earlier pending read from restoring an outdated list. Refocusing fetches the saved catalog. If a selected choice is retired, the composer selects an available category and the feed returns to All.
- Working hours remain sourced from the configured contact settings, now presented with a separate localized heading in a rounded navy card with a muted gold border. Empty hours produce no placeholder card.
- Multiple team departments were already implemented. Reverified selecting Sales and Support, saving, reopening and filtering the public team. Each selected filter contains the member, and All shows one copy.

## Verification

- API category/router tests: 14 passed, including permissions, confirmation, retry, auditing rollback and preservation of published labels.
- Focused interface tests: 54 passed across categories, moderation, public community, configured contacts and team departments.
- Browser category-deletion workflow: desktop/mobile Arabic and English passed. Existing team-department workflow passed on the same four projects.
- Working-hours visual checks: Chromium and WebKit at 360, 440 and 1440 CSS pixels, Arabic/English; eight checks passed. Heading/body placement, card styling and viewport overflow verified. Ignored evidence: `.local/working-hours-qa/`.
- OpenAPI and Postman include the authenticated deletion endpoint. Type checking, lint and client/server build passed before the final guarded GitHub push.
- Client JavaScript grows by about 2.3 KiB from the 2,815,837-byte baseline. The total budget gains a bounded 2 KiB above the prior cap; per-chunk and route-stylesheet caps remain unchanged. Obsolete public focus outlines were removed in favor of the existing shared focus treatment.

No production categories, posts, team records or site settings were changed from this workspace. Deployment uses the normal production update command.
