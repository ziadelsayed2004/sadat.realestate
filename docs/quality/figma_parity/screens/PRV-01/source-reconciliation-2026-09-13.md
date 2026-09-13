# PRV-01 direct source reconciliation — 2026-09-13

The official Figma node `6017:19032` was read directly. The Demo dashboard now uses the source-supported provider identity, the eight-card composition and canonical safe values (14 total, 8 published, 2 pending review, 1 needing changes, 1 booked viewing, 2 drafts, and 23 customer requests), plus the four source property records and their dates and statuses. Property status badges now use distinct semantic tones and `P-` display codes match the source.

The 1577px desktop frame retains the 240px rail, 56px top bar, four-column 313.25px metric grid, aligned 277px insight panels, quick actions, and recent-properties table. The shared `[data-state]` card rule no longer overrides the dashboard chart geometry. Mobile metric columns are calculated from the actual viewport, preserving the direct 402px source geometry while remaining correct at the project Pixel 5 width.

The safe dashboard contract does not expose aggregate property views, per-property views, or a six-month chart series. Those values remain visibly unavailable; no statistics were invented. The supported customer-request and booked-viewing values are rendered from the existing contract.

Desktop AR/EN passed 6/6 in snapshot-update mode and then 6/6 in normal verification. Tablet and mobile AR/EN passed 8/8, including authentication failure, navigation behavior, and no horizontal overflow. Client build and bundle budgets, typecheck, focused lint, and `git diff --check` passed.

PRV-01 remains `PARTIAL_EXTERNAL` only for the missing views and chart-series projections. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
