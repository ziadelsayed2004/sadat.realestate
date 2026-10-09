# About content location links — 2026-10-09

Published, active About blocks now have a View on website link beside Preview and Edit. The link opens `/about` in a new tab using the current language and a fragment identifying the specific block. The public intro and additional content blocks have stable matching anchors, with a scroll margin below the site header.

Draft or inactive blocks show a not-visible-to-visitors explanation instead of a link to an absent public section. Preview remains available. Opening the public location does not save or publish changes.

Validation on an isolated checkout of the staged changes:

- 39 existing CMS and public About/Team unit tests passed.
- 6 browser projects passed across Arabic and English on desktop, tablet and mobile, covering new-tab navigation, exact block positioning with delayed public data, intro navigation, publication visibility and no content mutations.
- Web TypeScript, ESLint and production build passed.
- Arabic desktop and mobile screenshots were inspected.

Production update remains manual after pulling main:

```bash
cd /root/sadat-release
git pull --ff-only origin main
bash deploy/native/manage-production.sh update
```
