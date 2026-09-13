# PRV-14 source reconciliation — 13 September 2026

The approved desktop export for Figma node `6017:20973` and stored direct metadata for tablet node `6017:120389` and mobile node `6017:119163` were reviewed against the rebuilt runtime. The published route now follows the canonical success composition: green success mark, concise heading and description, status/views card, published-edit warning, View public page action, My properties action, and active Add property navigation.

The former generic property summary, submission/review dates, review-reason panel, and safe-data explanation were removed from this state because they are absent from the source. The public action remains gated by the server-owned published state and uses the approved public slug route.

The source renders a numeric view count, but the current provider projection does not expose views. The runtime therefore displays the localized unavailable value and does not invent the source sample value `0`. PRV-14 remains `PARTIAL_EXTERNAL` for that projection gap.

Verification covered reviewed AR/EN visual baselines and explicit containment at 1024×720 and 402×760, including mobile action order. Keyboard reachability and fail-closed permission behavior passed in both locales. The component suite passed 9/9; translation sync/check, build and bundle budgets, typecheck, focused lint, and diff checks passed. No Production launch or Demo purge ran.
