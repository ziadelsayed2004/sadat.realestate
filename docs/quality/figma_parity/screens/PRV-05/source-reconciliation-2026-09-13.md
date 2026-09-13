# PRV-05 direct source reconciliation — 2026-09-13

The official desktop Figma node `6017:19858` and mobile node `6017:118128` were read directly. The details route now uses the shared “Add a new property” heading and instruction on desktop/tablet, places the eight-step rail immediately after that heading with steps 1–2 complete and step 3 active, and highlights Add property in the provider navigation. The mobile composition hides the redundant desktop introduction, uses the compact step rail and 12px card geometry, and stacks both actions at full width with Continue first.

The approved `propertyDetailsStepSchema` persists localized description, `propertyTypeId`, delivery status, total area, bedrooms, bathrooms, floor, and total floors. The runtime retains the provider-safe property-type catalog boundary, retry fallback, validation, optimistic version, owner-scoped save, draft reason, and keyboard behavior. Figma additionally shows land/building/display/storage areas, construction year, frontage, ceiling height, entrances, and amenity chips. Those fields are absent from the active details contract and were not added as controls that would discard user input.

The focused AR/EN desktop baselines passed 2/2 during the intentional update and 2/2 in normal verification. Responsive AR/EN checks passed 4/4 at the mapped 1024×900 and 402×969 sizes, proving that the stepper, card, reason, actions, and back control remain inside the viewport with no horizontal overflow. Client and server builds, translation validation, bundle budgets, typecheck, focused lint, and `git diff --check` passed.

PRV-05 remains `PARTIAL_EXTERNAL` for the missing extended property-metadata contract. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
