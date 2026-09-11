# SEK-08 direct Figma density review — 11 September 2026

The canonical source was read directly from Figma file `Odl1Epn2u6lIEuIMmABT7o`, node `6027:6850`, before changing the implementation. The frame uses a 672px profile canvas, 24px card padding, compact preference groups, and places the submit action below the white preferences card.

The desktop implementation now removes duplicated spacing between preference groups, uses compact legend/chip/input density, and positions the submit action below the card. These rules are scoped to `SEK-08`; the personal-information and account-settings forms keep their own layout. The deterministic capture fixture now includes the source's 100–200 square metre range.

Measured Arabic result:

- source: 1551×997
- runtime: 1551×997
- previous material difference (`identity-v3`): 15.2225%
- density repair material difference (`density-v8`): 11.4193%
- current material difference after canonical physical alignment (`alignment-v10`): 10.7747%
- latest evidence: `runtime-after-alignment-v10.png`, `diff-alignment-v10.png`, `visual-metrics-alignment-v10.json`, and `runtime-after-alignment-v10-capture.json`

The English LTR capture also has matching 1551×997 dimensions and is preserved as `density-v8-en`. Its pixel percentage is compared with the Arabic canonical frame, so it is evidence for layout/direction only and is not used as an English visual-parity score.

The choice groups now follow the source's physical left-to-right order while the numeric range grids retain their Arabic `من`/`إلى` direction. The submit action is physically left aligned, and the Arabic subtitle and “both” choice use the canonical wording.

SEK-08 remains `PARTIAL_EXTERNAL`. The direct pixel difference is still material and the canonical named identity/avatar prerequisite remains unresolved, so these repairs do not promote the strict Figma closure counter.
