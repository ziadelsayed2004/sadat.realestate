# Floating controls and deployment hygiene — 2026-10-27

- Gold SVG scroll-progress ring and back-to-top button; passive scroll listener, animation-frame batching, content resize observation, reduced-motion support and keyboard labels.
- The themed WhatsApp link sits above the top button; the group clears developer mobile bottom navigation.
- CodzHub credit uses a locally hosted 3,540-byte Lemonada wordmark subset and included OFL license. The design gradient is taken from the public CodzHub brand SVG; platform copyright remains separate.
- Chromium and WebKit passed at 390, 820 and 1440 CSS pixels in Arabic and English. Verified real scroll progress, return to top, contact URL, button geometry, hosted font loading, document width and developer navigation clearance. Local screenshots and JSON are ignored under `.local/floating-actions-qa/`.
- Generated artifact cleanup removed 1,680 tracked files totaling 344,937,425 bytes (329 MiB). Local copies are archived under `.local/generated-artifacts-archive/`. Approved final design sources, actual application assets, Playwright golden baselines and the one required release-evidence image remain tracked.
- Ignore-policy checks cover nested Playwright output, generated QA captures and rejected Figma candidates while keeping required sources versionable.
- Native shell fixtures verify current/rollback release retention, removal of stale staging sources, post-build artifact cleanup, preservation of runtime `dist`, and refusal to delete outside release roots or through symbolic links.
- Daily `update` preserves application data; it does restart services while activating a release. Database, uploads and backup directories are outside cleanup scope.
