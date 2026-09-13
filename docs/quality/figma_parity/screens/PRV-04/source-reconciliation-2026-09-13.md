# PRV-04 direct source reconciliation — 2026-09-13

The official Figma node `6017:19679` was read directly. The location step now shares the source “Add a new property” heading and instruction, places the eight-step rail immediately after the heading with step 1 complete and step 2 active, keeps the 768px centered canvas, and highlights Add property in the provider navigation.

The approved `propertyLocationStepSchema` accepts a master `locationId`, a safe HTTPS `mapUrl`, and a complete latitude/longitude pair. The runtime keeps catalog search, offline fallback, retry, validation, and the exact schema-shaped save flow. Figma additionally contains city, district, neighborhood, street, building number, landmark, map picker, and approximate-location visibility fields. These are absent from the current save contract and were not represented as inputs that would silently lose user data.

The focused AR/EN location baselines passed 2/2 during the intentional update. The complete affected wizard suite then passed 10/10 in normal verification, covering create, location save, authentication and ownership denial, and explicit no-overflow geometry at 1551, 768, and 393 pixels for both PRV-03 and PRV-04. Client build and bundle budgets, typecheck, focused lint, and `git diff --check` passed.

PRV-04 remains `PARTIAL_EXTERNAL` for the missing structured-address, map-picker, and public-approximation contract fields. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
