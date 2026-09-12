# SEK-02 row layout review

Official Figma `get_design_context` read on 2026-09-12: file `Odl1Epn2u6lIEuIMmABT7o`, node `6027:4046`. Source has request ID, type/property, provider, date and status/action columns. The implementation now separates these using the existing safe property projection. Missing provider data renders a dash; no production identity or business data is fabricated.

Fixed status/detail compression discovered during visual review: outcome children retain their text and wrap as units. Browser geometry checks passed in AR/EN at 393, 768, 1280 and 1551 CSS pixels, proving document width containment, row containment and no status/link intersection. These are viewport-resize checks with mocked API routes, not real mobile-device or live journey acceptance.

List screenshots were visually reviewed in both locales and updated; list/pagination tests passed 2/2. Component tests passed 5/5. Rich property fixtures are limited to the list, preserving separate detail fixtures.

SEK-02 remains PARTIAL: source row inventory, exact spacing/header/filter/date styling and account media are not fully matched. Runtime filters preserve supported server statuses rather than inventing source-only counts. The official 90/119 closure count is unchanged.

Four SEK-03/04 desktop visual comparisons still fail after isolating list fixtures. The old baselines show an older shared shell and detail composition; they were not updated in this change. Their current source comparison and acceptance remain the next task.
