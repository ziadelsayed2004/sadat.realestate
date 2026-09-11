# SEK-08 direct Figma density review — 11 September 2026

The canonical source was read directly from Figma file `Odl1Epn2u6lIEuIMmABT7o`, node `6027:6850`, before changing the implementation. The frame uses a 672px profile canvas, 24px card padding, compact preference groups, and places the submit action below the white preferences card.

The desktop implementation now removes duplicated spacing between preference groups, uses compact legend/chip/input density, and positions the submit action below the card. These rules are scoped to `SEK-08`; the personal-information and account-settings forms keep their own layout. The deterministic capture fixture now includes the source's 100–200 square metre range.

Measured Arabic result:

- source: 1551×997
- runtime: 1551×997
- previous material difference (`identity-v3`): 15.2225%
- current material difference (`density-v8`): 11.4193%
- evidence: `runtime-after-density-v8.png`, `diff-density-v8.png`, `visual-metrics-density-v8.json`, and `runtime-after-density-v8-capture.json`

The English LTR capture also has matching 1551×997 dimensions and is preserved as `density-v8-en`. Its pixel percentage is compared with the Arabic canonical frame, so it is evidence for layout/direction only and is not used as an English visual-parity score.

SEK-08 remains `PARTIAL_EXTERNAL`. The direct pixel difference is still material and the canonical named identity/avatar prerequisite remains unresolved, so this repair does not promote the strict Figma closure counter.
