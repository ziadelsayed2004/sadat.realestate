# Public carousel follow-up — 2026-10-24

The owner requested stable advertising heights, previous/next controls on opposite sides, smoother slide changes, clearer pagination, and a full-area phone hero background rather than an image above separate copy.

Featured cards now use a viewport-responsive height that is independent of image aspect ratio and copy length. On narrow cards the photograph has a fixed-height row and the copy occupies the remaining space. Long copy can scroll within its panel instead of moving the next page section. The CTA remains keyboard reachable. Direction-aware arrow icons and logical positioning put previous/next on opposite sides in both Arabic and English. Pagination uses round indicators and a gold active pill inside 44-pixel button targets with selected state and focus styling.

Featured changes animate with a short fade/translation. The hero retains the outgoing loaded photograph during its fade into the next preloaded image and animates the corresponding copy. Reduced-motion preferences disable the visual animations. Hero pagination sits below the copy, outside the search panel's hit area. The phone image fills the first viewport behind the text using proportional `object-fit: cover`, without letterboxing or a separate empty background block; a wide source image necessarily has some side cropping in a portrait viewport. Images are not stretched.

The regular production update previously restarted both services again after `deploy-release.sh` had already activated, restarted and checked them. The second restart is now skipped for `update`; data modes retain their required restart. The shell fixture verifies exactly one restart and preserves database/private/backup sentinels. The service continues running during build, with a short restart at activation. This change does not claim zero downtime or run a production deployment from this workstation.

Verification:

- Focused frontend suites: 64 initial tests passed (public homepage, featured advertising and homepage copy priority); the final homepage suite passes 40 tests including the new outgoing-image/650 ms cleanup and persistent pagination state regression. The 25-test admin guide suite also passes.
- Native deployment shell fixtures: both tests passed, including failure/rollback/retention and the single-restart update path.
- Type checks, lint and build/bundle checks passed during local verification; the mandatory pre-push hook repeats full repository checks.
- [Real local Chromium/WebKit report](guide-runs/public-carousels-local-latest.json): Arabic/English at 390, 820 and 1440 pixels; fixed heights across different image/text content; actual arrow/dot clicks, selected state, animation and reduced motion; no page overflow or browser errors. Fixtures are removed and prior configuration restored afterward.
- Local screenshots: `.tmp/public-carousels/`.

Owner update command and its availability/data behavior: [regular updates guide](../deployment/REGULAR_UPDATES_AR.md).
