# PRV-09 direct source reconciliation — 2026-09-13

The official desktop Figma node `6017:20561` and mobile node `6017:118695` were read directly, with tablet mapping `6017:116610`. The contact route now places the shared add-property heading before step 7 on desktop/tablet, highlights Add property in provider navigation, and uses the compact step rail and card geometry on mobile.

The supported contact role, contact name, phone, WhatsApp, email, preferred contact time, internal notes, preferred locale, and three public-visibility switches remain contract-shaped and owner scoped. Continue persists the draft and advances to review. The restored Save draft action uses the same approved contact mutation and stays on the contact route; mobile shows Continue then Save draft at full width while omitting the desktop Back action.

The focused payload assertion was corrected to cover the role and visibility flags actually submitted by the form. A separate browser test proves draft saving does not advance. Validation, optimistic versioning, permission handling, safe projection, and the separation between account identity and public business contact remain intact.

The source displays a named account contact and a sales-employee role, while the active provider projection exposes no account/staff directory from which those identities can be selected or auto-filled. The screen therefore keeps editable approved contact fields and does not invent personnel records.

The focused AR/EN desktop baseline update passed 2/2 for the contact view; the final functional desktop run passed 4/4 for Continue and Save draft. Responsive AR/EN checks passed 4/4 at 1024px and 402px with no horizontal overflow. Client/server builds, translations, bundle budgets, typecheck, focused lint, and `git diff --check` passed.

PRV-09 remains `PARTIAL_EXTERNAL` only for the missing provider account/staff directory projection. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
