# Multiple team departments — 2026-10-27

Team members can belong to multiple saved departments, for example Sales and Support. The member editor uses checkbox chips; the administration list and public card show every assigned department. Each department filter includes the member, while All renders the member once. Job title remains independent of department membership.

The optional, unique, bounded `categories` array is persisted and returned by administrative and public reads. Existing records with the legacy singular `category` field retain their assignment without migration. Writes synchronize the singular compatibility field to the first selection. An explicitly empty array clears all departments and suppresses legacy presentation fallbacks; unrelated updates do not clear assignments. New selections must be active valid departments. Previously assigned inactive departments are retained unless removed by the owner.

Verified:

- 26 focused API tests including array validation, legacy Mongoose defaults, save/read, clearing, invalid departments and existing CMS publication/version controls.
- 69 focused UI tests including editor selection retention after failed saving, public filtering, legacy/cleared records and the synchronized downloadable admin guide.
- Type checks for API and web, client/SSR build and bundle limits.
- Five Playwright runs: desktop Arabic/English, tablet Arabic, and mobile Arabic/English. Created a new department, selected three departments, saved/reopened, checked every selected public filter, verified no duplicate under All, and checked viewport fit. Tests use local API fixtures and do not alter production.
- Screenshots are ignored under `apps/web/test-results/`. Multi-selection adds approximately 1.4 KiB of uncompressed JavaScript, with a bounded 2 KiB total-budget allowance; chunk and stylesheet limits are unchanged.

The in-app administrator guide and its downloadable owner/staff copies explain multi-selection and explicit clearing. No production migration or data-reset command is needed; deploy with the normal update procedure.
