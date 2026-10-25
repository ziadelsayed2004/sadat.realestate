# Stable homepage hero during slide changes

The hero background images already fill an absolutely positioned frame. The moving height came from the active slide's variable title, description and optional destination link changing the grid/flex content height, especially on phones.

All slide copy now shares one overlapping grid cell, reserving the tallest copy from the initial render. Only the selected slide is visible, accessible and interactive; inactive copies are inert, hidden from assistive technology, and use a non-heading title element. This reserves height without truncating the advertisement, changing the image proportions or delaying layout until images load. The title, pagination and search stay inside the photograph; existing fade/zoom and reduced-motion support remain.

The real local carousel verifier now rotates a landscape image with short copy against a square logo with a longer localized title, paragraph and destination link. It asserts identical hero heights, document positions for search and pagination, one accessible h1, working arrows/dots, image fill and no horizontal overflow, in Chromium/WebKit at 390/820/1440px in Arabic/English. Document positions include scroll offset so browser scrolling to a clicked button is not confused with layout movement. Evidence: `guide-runs/public-carousels-local-latest.json`. Fixtures are local-only and restored/removed; no production content was changed.

Homepage component tests: 40 passed. Production build and native geometry checks are rerun against the final source before the normal protected GitHub push.
