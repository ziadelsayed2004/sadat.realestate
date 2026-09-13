# SEK-08 direct source reconciliation — 2026-09-13

The official Figma node `6027:6850` was read directly. The search-preferences fixture now uses the source values: buy purpose; apartment and duplex; First and Third Districts; EGP 500,000–1,500,000; 100–200 m²; three bedrooms; and either payment method. The invented mixed-language `First District` custom value and New Cairo selection no longer appear in the Arabic screen.

The redundant in-card heading was removed, and the desktop tabs now follow the source treatment with the active preferences tab on a white raised surface. The form remains the source-aligned 672px card, with its save action outside the card and all choice, numeric-range, and payment controls preserved as functional inputs.

After rebuilding the client bundle, the complete shared profile suite passed 20/20 across Arabic and English. A further focused AR/EN check passed 2/2 and exercises SEK-08 at 1551, 768, and 393 pixels, asserting that the form and save action remain within the viewport. The reviewed visual baselines passed 2/2; lint, bundle budget, and `git diff --check` passed.

SEK-08 remains `PARTIAL_EXTERNAL` only because the safe `/me` account projection has no approved seeker avatar/media field. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
