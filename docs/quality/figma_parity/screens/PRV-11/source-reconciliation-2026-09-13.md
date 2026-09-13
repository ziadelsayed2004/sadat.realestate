# PRV-11 canonical-source reconciliation — 2026-09-13

The approved canonical export for Figma node `6017:21064` was reviewed against the rebuilt runtime. Live Figma browser access was unavailable in the current environment, so this record does not claim a new direct-node retrieval.

The validation route now uses the standalone centered status composition shown by the source: warning icon, concise heading and instruction, review-notes panel, primary Start editing action, and secondary Come back later action. Add property remains active in provider navigation. The unrelated wizard step rail, property summary, and safe-summary card were removed from this terminal state.

The provider contract exposes one `reviewReason` and server-owned safe property fields. The runtime combines that reason with validation issues derived from missing location, price, contact, or invalid status. It does not fabricate the three richer review-comment records shown in the source. Editing remains gated by `availableActions` and routes to the owner-scoped location step.

The Arabic fixture now uses correct Unicode and a localized review reason, eliminating the mixed-language evidence defect. The desktop AR/EN baseline update passed 2/2 and the final no-update run passed 2/2. That run also verified containment and zero horizontal overflow at 393px and 768px. Web client/server build, translation consistency, bundle budgets, typecheck, focused lint, and `git diff --check` passed.

PRV-11 remains `PARTIAL_EXTERNAL` because the active contract has no structured multi-comment review payload, and a new direct Figma retrieval was unavailable. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
