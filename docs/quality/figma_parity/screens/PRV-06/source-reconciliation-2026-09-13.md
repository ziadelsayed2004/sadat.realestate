# PRV-06 direct source reconciliation — 2026-09-13

The official desktop Figma node `6017:20034` and mobile node `6017:118284` were read directly. The pricing route now uses the shared “Add a new property” heading and instruction on desktop/tablet, places the eight-step rail immediately after it with steps 1–3 complete and step 4 active, and highlights Add property in the provider navigation. The existing mobile composition keeps the compact step rail, single-column fields, full-width Continue/Save actions, and stacked commission records.

The approved `propertyPricingStepSchema` persists the total amount and currency plus an optional payment plan with localized name, installment count, frequency, optional down payment, and installment amount. The runtime also consumes the authenticated provider commission projection and displays its policy source, calculation kind, value, effective date, and version without exposing internal fields. The reviewed browser evidence now uses a successful policy projection instead of an unavailable-state placeholder.

Figma additionally contains negotiability, cash/installment/both payment-method selection, maintenance deposit, additional fees, payment notes, provider account type, a policy-detail link, and an acknowledgement control. Those fields and mutations are absent from the active pricing and commission contracts and were not introduced as non-persisting controls.

The focused AR/EN desktop baselines passed 2/2 during the intentional update. Normal affected verification passed 6/6 across desktop, tablet, and mobile in AR/EN, including the mapped 1024×1340 and 402×1514 responsive geometry, five distinct commission records, full-width mobile actions, and zero horizontal overflow. Client/server builds, translation validation, bundle budgets, typecheck, focused lint, and `git diff --check` passed.

PRV-06 remains `PARTIAL_EXTERNAL` for the missing pricing-policy fields. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
