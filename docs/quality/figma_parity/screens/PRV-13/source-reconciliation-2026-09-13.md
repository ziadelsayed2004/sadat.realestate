# PRV-13 source reconciliation — 13 September 2026

The approved desktop export for Figma node `6017:21123` and stored direct metadata for tablet node `6017:117183` and mobile node `6017:119117` were reviewed against the rebuilt runtime. The rejected route now follows the canonical status composition: red failure mark, concise title and description, server-owned rejection reason card, Back to my properties action, disabled Contact support control, and active Add property navigation.

The former generic property summary, unavailable dates, safe-data explanation, and trailing unavailable-action message were removed from this state because they are absent from the source. The rejection reason remains sourced only from `reviewReason`; administrative assignment, audit data, or internal notes are not exposed.

The design presents Contact support as an action, but the current application contracts expose no approved provider support route or mutation. The control is therefore visible and explicitly disabled with an unavailable explanation instead of linking to an invented destination. PRV-13 remains `PARTIAL_EXTERNAL` for that contract gap.

Verification covered AR/EN visual baselines plus explicit containment at 1577px desktop baseline, 1024×900 tablet, and 402×780 mobile. The component suite passed 9/9. Translation sync/check, build and bundle budgets, typecheck, focused lint, and diff checks passed. No Production launch or Demo purge ran.
