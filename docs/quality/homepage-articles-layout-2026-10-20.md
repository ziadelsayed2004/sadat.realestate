# Homepage article section spacing — 20 October 2026

The reported homepage section was inspected on the production site without writes. At a 1920 px viewport, its heading had a **106 px bottom gap**, and its three cards extended **22.3 px below the section's fixed 587 px height**. The section's clipping boundary cut off that content. Adding the CMS description introduced an additional block into a layout whose height and margins had been set for a fixed screenshot.

The article section and cards now grow with their content. The heading-to-description gap is 16 px and the description-to-grid gap is 24 px; without a description, the grid follows the heading directly. The title and “View all” action remain side by side on narrow screens, with long text wrapping inside its column. Other homepage sections retain their layout.

Article thumbnails keep a consistent 16:9 frame. Card titles and summaries wrap to two lines, author/reading-time metadata stays inside each card, and cards in the same row retain equal heights. There is no fixed card or section height to cut off longer text, descriptions or additional rows.

Validation uses `node --import tsx scripts/verify-homepage-articles-layout-local.mjs` against real local HTTP and MongoDB, with no intercepted responses. Chromium and WebKit each cover six Arabic/English viewport combinations from 320 to 1920 px, plus long unbroken headings/descriptions and no-description cases: **18 scenarios**. Assertions check natural section containment, compact heading/description gaps, separate title/action columns, image aspect ratios, equal row heights, metadata containment, no following-section overlap and no document overflow. The temporary local CMS section is restored exactly afterward.

Evidence: [homepage-articles-layout-local-latest.json](guide-runs/homepage-articles-layout-local-latest.json). Local screenshots are saved under `.tmp/home-articles`. Lint, type checks, the complete test suite and a production build run through the normal guarded GitHub push.

This delivers source changes only. Production CMS text is unchanged, and the live site requires deployment of the new build.
