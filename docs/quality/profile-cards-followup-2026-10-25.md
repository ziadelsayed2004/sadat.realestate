# Developer and project presentation follow-up — 2026-10-25

Owner request: retain complete images, improve project/unit cards and developer identity presentation, make the project's external website action yellow with an icon, and display complete project images in administration.

Changes:

- Public unit cards retain their white surface, clear provider/title, project affiliation and details action. Their fixed 4:3 image frame now contains the full photograph, including portrait uploads.
- Project cards use a larger 4:3 image frame, readable text and a yellow project action. Project details use a 16:9 frame. Both preserve the saved `contain`/`cover` choice; the default is the complete image.
- Image elements are bounded inside their frames rather than contributing intrinsic dimensions that can overflow a grid. Developer logos retain their complete image without the decorative border/padding on all screen sizes.
- The project's validated website URL is a yellow action with an external-link icon, an accessible label, a visible keyboard focus indicator and `noopener noreferrer` for the new tab.
- Administrative project rows now include a complete, authenticated thumbnail alongside the existing review link. The project editor preview has a stable frame and preserves the selected display mode. No public/private image access policy or saved project data is changed.

Verification evidence is recorded in [the local browser run](guide-runs/profile-cards-local-latest.json). The `--profile-cards` variant of `scripts/verify-production-followup-local.mjs` exercises the existing follow-up regressions plus the administrative thumbnails/editor and public image/button presentation in Chromium and WebKit at 390, 820 and 1440 px. It uses real local API/Mongo/media storage and removes its own fixtures. The unrelated-owner project fixture now includes its required creation/update dates so it can be read through the administrative list as well as the ownership checks.

Results: all 23 native browser check groups passed, with zero captured page errors and completed fixture cleanup. The 30 focused public-developer/admin-project component tests, type checking, lint and the production build/bundle budgets also passed. Existing bundle limits were retained; obsolete duplicate styling was removed.

The public production links were visited read-only. They still showed the earlier beige unit-card design at the start of this work. No production account, subscription, property or image was edited. GitHub delivery and server deployment are separate steps.
