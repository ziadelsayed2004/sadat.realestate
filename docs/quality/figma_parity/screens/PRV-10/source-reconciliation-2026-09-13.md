# PRV-10 direct source reconciliation — 2026-09-13

The official desktop Figma node `6017:20737`, tablet node `6017:116846`, and mobile node `6017:118851` were read directly. The review route now places the shared add-property heading before step 8 on desktop and tablet, highlights Add property in provider navigation, and uses the compact source composition on mobile.

The review card is split into four safe sections for basic property data, location, pricing, and contact/media availability. The implementation renders only approved fields from the active provider property projection. It does not fabricate the richer property attributes, media records, or labels visible in the canonical frame.

The three confirmations gate the real owner-scoped submit mutation. The browser baseline is captured before submission, after all confirmations are selected, so it represents PRV-10 rather than the submitted state. The mutation-required audit reason is localized in Arabic and English and remains editable even though that contract field is absent from the visual source.

The desktop AR/EN baseline update passed 2/2. The final desktop submission and accessibility run passed 4/4, and responsive AR/EN checks passed 4/4 at 1024px and 402px with no horizontal overflow and the correct mobile Submit/Back order. Web client/server build, translations, bundle budgets, typecheck, focused lint, and `git diff --check` passed.

PRV-10 remains `PARTIAL_EXTERNAL` because the active safe provider contract does not expose every canonical review and media field. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
