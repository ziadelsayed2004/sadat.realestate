# Public images and developer profile navigation — 2026-10-25

Owner request: fill company cover areas and other photographic frames, move profile section navigation to a sticky side rail on laptop and a fixed bottom rail on mobile, and inspect public styling for visible conflicts.

Implemented behavior:

- Company directory/profile covers default to filling the frame. Explicitly saved full-image preferences remain available, and the company editor now previews/saves the same default as the public pages. A logo used without a cover keeps its complete shape.
- Profile unit photographs and the property gallery fill their frames with proportional cropping. The existing property image viewer still displays the original/full image. Article carousel thumbnails fill their frames; editorial hero images use natural height at full width, preserving embedded text without sidebars. Project cards keep their previously requested natural image proportions. Logos, floor plans and administrative review images retain their complete presentation.
- Profile section links use icons and a compact sticky rail beside the content above 1024 px. At phone/tablet widths they become a single fixed bottom row, with space reserved below the page and WhatsApp raised above it. Long names are bounded, and native anchors, active section indication and keyboard links are retained. Project pages use the same responsive rail.
- Superseded profile content width/padding rules were removed rather than layered with another breakpoint override. English profile columns now retain English text direction as well as Arabic RTL behavior. Smooth fragment scrolling respects reduced-motion preferences.
- Five missing shared design variables were defined: heading-three size, critical text, accent, on-accent and muted surface. The remaining range-slider variables are supplied dynamically by the existing slider component.

Verification evidence:

- [Profile rail native results](guide-runs/profile-rail-local-latest.json): 18 Chromium/WebKit Arabic/English viewport groups, spanning 320–1920 px. Real local API/Mongo/media, default filled covers, side/bottom placement, anchor alignment, active marker, non-overlapping WhatsApp and project navigation. Zero captured page errors and fixture cleanup completed.
- [Read-only production browsing](guide-runs/public-style-live-2026-10-25.json) covered the homepage, property listing/detail, company directory/profile, project detail, article listing/detail, community, about, team and comparison at 390/820/1440 px: 36 route/viewport visits. It found no document-width overflow, broken rendered images or captured JavaScript page errors. This verifies the pre-deployment site, not the local changes.
- [Local public browsing](guide-runs/public-style-local-latest.json) passed all 72 route/viewport visits across Chromium and WebKit on the updated built pages, with no findings or captured page errors. The normal protected push checks lint/types/full test suites/build budgets.
- The 88 focused public-developer/article/property-detail component tests and the searchable owner guide validation passed. The owner/staff/provider guides explain the updated default. The measured route CSS increase is 507 bytes after removing obsolete layout rules; its cap increases by 512 bytes, while JavaScript caps remain unchanged.

No production records, uploads, account types or approvals were changed. Signed-in production dashboards were outside this public presentation review. Server deployment remains separate from pushing to GitHub.
