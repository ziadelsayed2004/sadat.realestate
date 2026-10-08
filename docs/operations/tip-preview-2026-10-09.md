# Tip preview — 2026-10-09

The tips table now offers Preview for each saved tip. The editor shows a live preview beside its fields on desktop and below them on smaller screens. The preview supports Arabic and English, uses the public site's translation fallback, and explains that unsaved edits are not persisted.

Published, active tips now render in the homepage Tips section. Previously the public API supplied tips, but the homepage did not render that content type. The editor and homepage share TipCard, preserving the complete body and its line breaks. The API's existing publication and active-state filtering remains authoritative.

Preview actions do not save or publish content. Visibility guidance explains that a tip must be saved, published and active.

Validation was run against an isolated checkout of the staged changes:

- 36 Vitest checks passed (admin home and public homepage).
- 6 Playwright projects passed (Arabic and English on desktop, tablet and mobile), covering saved and live previews, translation fallback, saving, publication and matching public cards.
- Web TypeScript, ESLint and production build passed.
- Desktop editor and published card screenshots were inspected.

Production deployment remains manual after pulling main:

```bash
cd /root/sadat-release
git pull --ff-only origin main
bash deploy/native/manage-production.sh update
```
