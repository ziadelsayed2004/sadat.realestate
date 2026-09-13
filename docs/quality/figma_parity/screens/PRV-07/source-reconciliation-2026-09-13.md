# PRV-07 direct source reconciliation — 2026-09-13

The official desktop Figma node `6017:20229` and mobile node `6017:118435` were read directly. The features route now uses the shared “Add a new property” heading and instruction on desktop/tablet, places the eight-step rail immediately after it with steps 1–4 complete and step 5 active, and highlights Add property in the provider navigation. The mobile composition hides the redundant desktop heading, uses the compact step rail and 12px card geometry, and stacks the Continue and Save actions at full width.

The approved `propertyFeaturesServicesStepSchema` persists unique, non-overlapping `featureIds` and `serviceIds`, an optimistic version, and an audit reason. The runtime preserves validation, owner-scoped save, fail-closed authentication, the explicit provider-catalog boundary, and the guarantee that admin taxonomy routes are never called from this screen.

Figma shows named feature chips, a platform-generated advice banner, surrounding-place records, an add-service action, and private notes. The provider contract exposes neither approved feature/service labels nor surrounding-place and note fields. Those controls were not fabricated and the runtime continues to accept only approved references from an authorized source.

The focused AR/EN desktop baselines passed 2/2 during the intentional update and 2/2 in normal verification. Responsive AR/EN checks passed 4/4 at the mapped 1024×1340 and 402×950 sizes, proving that the stepper, reference fields, catalog boundary, reason, actions, and back control remain inside the viewport with no horizontal overflow. Client/server builds, translation validation, bundle budgets, typecheck, focused lint, and `git diff --check` passed.

PRV-07 remains `PARTIAL_EXTERNAL` for the missing provider taxonomy, surrounding-place, and note contracts. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
