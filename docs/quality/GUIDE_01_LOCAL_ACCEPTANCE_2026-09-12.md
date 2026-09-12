# GUIDE-01 local functional acceptance — 2026-09-12

GUIDE-01 covers entering the public platform and reaching property and developer discovery. `guide-runs/discovery-local-latest.json` passed 6/6 real browser runs in Arabic and English on Desktop, Tablet, and Pixel 5. Each run moved from the homepage search to the property listing, applied a live filter, recovered an offline request without document navigation, cleared an empty result, and opened the developer directory and a public profile. Public API responses were 200, page errors were zero, and every final page width matched its viewport without horizontal overflow.

`guide-runs/discovery-validation-local-latest.json` rejected seven invalid property queries with 400 and then accepted a valid query with 200. `guide-runs/discovery-pagination-local-latest.json` proved out-of-range empty-page recovery to page one in all six locale/device combinations.

The journey is intentionally public and read-only. Ownership, account/session state, role authorization, duplicate mutation, optimistic write versions, decision reasons, and audit rollback are not applicable. GUIDE-01 remains globally `PARTIAL` until independent Figma acceptance, the final project-wide quality gate, and Production verification. Demo remains unchanged and no launch or purge ran.
