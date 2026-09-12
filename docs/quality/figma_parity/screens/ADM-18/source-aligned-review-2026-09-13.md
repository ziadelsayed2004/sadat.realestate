# ADM-18 source-aligned review — 2026-09-13

The official Figma source was read directly from file `Odl1Epn2u6lIEuIMmABT7o`, frame `6017:69276`, with detailed content context from node `6017:69859`.

The request-management content now matches the recovered source structure and density: the 24/32 heading and count, 117 × 38 CSV action with the exported 14 × 14 Figma icon, 72px compact toolbar, source labels and six-row populated state, 44px table header, 53px rows, 22px bordered status badges, date-only presentation, 96 × 28 detail actions, and no redundant one-page pagination.

Arabic uses the exact source wording and deterministic source data. English keeps the equivalent localized structure. The Arabic sidebar remains on the right by the recorded product-authority decision based on the supplied current product examples; this is the sole approved directional exception to the historical frame.

Validation completed against the rebuilt application:

- Web component and CSV export tests: 11/11 passed.
- ADM-18 through ADM-24 functional browser flow: 10/10 passed in Desktop AR/EN.
- Exact ADM-18 geometry assertions: 2/2 passed at 1577 × 944, including zero horizontal overflow.
- Reviewed Desktop AR/EN visual baselines: 2/2 passed without snapshot update mode after the two ADM-18 baselines were reviewed and replaced.
- Web build, translations check, and bundle budgets passed.

Evidence:

- Official source region: `source-content-2026-09-11.png`
- Rebuilt Arabic runtime: `runtime-source-aligned-ar-2026-09-13.png`
- Rebuilt English runtime: `runtime-source-aligned-en-2026-09-13.png`
- Machine review: `review.json`

Classification: `REPAIRED_VERIFIED`.
