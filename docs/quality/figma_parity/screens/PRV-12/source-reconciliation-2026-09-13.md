# PRV-12 canonical-source reconciliation — 2026-09-13

The approved desktop export for node `6017:21012` and stored source metadata for tablet node `6017:121763` and mobile node `6017:119003` were reviewed against the rebuilt runtime. Live Figma browser access was unavailable, so this record does not claim a new direct-node retrieval.

The submitted route now has its own source-shaped composition: success mark, centered title and description, a compact three-row card for reference, submission date, and status, then View property and Back to my properties actions. Add property remains active. The prior generic property summary, unavailable review date, submission-reason notice, and safe-data panel were removed from this state.

The mobile layout follows the stored 402px source geometry, with a 64px success badge, contained card, and full-width actions stacked with View property first. Tablet and mobile containment is asserted at the exact 1024×720 and 402×858 source viewports in both locales.

The active provider projection does not expose the canonical `SDT-33390` public reference. The runtime therefore displays the approved property id and does not fabricate a public code. Server status must be `pending_review`; status mismatch and authentication denial remain fail closed.

The affected component suite passed 9/9. AR/EN baseline update passed 2/2 and normal no-update verification passed 2/2. Web build, translations, bundle budgets, typecheck, focused lint, and `git diff --check` passed.

PRV-12 remains `PARTIAL_EXTERNAL` for the missing canonical public reference contract. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
