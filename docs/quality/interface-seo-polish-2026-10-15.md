# Interface and SEO polish — 2026-10-15

- [x] The homepage hero fills the available viewport after measuring the actual header. It grows when content needs more room; mobile retains a complete banner above a separate search form.
- [x] Interface selection, image/link dragging and tap highlights are disabled. Text inputs, textareas and editable content retain text selection. Rounded green focus feedback replaces sharp blue outlines; system high-contrast keyboard outlines remain available.
- [x] Buttons and action links have no underline in normal, hover, focus or active states. Administration controls share sizing, spacing and disabled states.
- [x] Featured advertisements use responsive cards with image, status, dates, grouped actions and a clear visibility explanation. Display settings sit with their toolbar controls. Banner editor fieldsets no longer force the mobile form beyond its inner gutters; URL fields use left-to-right text.
- [x] The administration dashboard and shared surfaces use consistent neutral backgrounds, borders, green accents and responsive controls.
- [x] Default Arabic/English SEO titles/descriptions, canonical domain, indexing and sitemap settings are available without a saved record. Missing legacy values receive defaults; saved choices, including disabled indexing, take precedence. Administrators can customize and save the defaults through the existing versioned settings screen.
- [x] Server HTML includes descriptions, canonical/hreflang links, OpenGraph and Twitter preview images, and homepage WebSite/publisher structured data. Structured-data URL fields become absolute in server output. Private routes remain noindex and excluded from the sitemap.

Verification: settings service tests cover defaults, first save, custom canonical/indexing and legacy fields. Frontend SEO/settings/featured/preview tests and SSR tests passed. Real browser checks against the local API covered homepage widths 390/768/1440 and dashboard, banner list, banner editor, featured ads and SEO settings at 390/1440: viewport fit, form gutters, selection/drag behavior, focus feedback, underlines and rendered SEO/crawler documents. Local fixtures were removed. Reports/screenshots are under `.tmp/polish-qa/` and `.tmp/polish-webkit/`.

Reference: [Google Search Central guidance on titles, descriptions, crawlable links and sitemaps](https://developers.google.com/search/docs/fundamentals/get-started-developers).

Delivery gate: normal guarded push to main runs lint, typecheck and the full test suite against the committed clean working tree. No production deployment.
