# PRV-22-3 source reconciliation — 13 September 2026

The approved desktop export for Figma node `6028:12067` at 1577×1035 was reviewed against the provider security-settings tab. No separate responsive owning frame is recorded for this screen. The shared heading and tab rail now follow the canonical 672px canvas, and both security cards use that same width. A global `[data-state]` rule that expanded unavailable provider cards and changed their presentation was excluded from this component. The canonical Danger zone heading and red treatment are restored.

Password-change and account-deletion mutations are absent from the approved provider contracts. Their controls therefore remain disabled and the runtime states their unavailability instead of submitting decorative or unsupported actions. PRV-22-3 remains `PARTIAL_EXTERNAL` pending those server-owned workflows.

Intentional AR/EN desktop baseline update passed 2/2 and final no-update verification passed 2/2. Responsive containment passed 4/4 on Tablet and Pixel 5 in AR/EN. The Arabic desktop result was visually reviewed. Translation check, client build and bundle budgets, typecheck, focused lint, and diff checks passed. Strict Figma totals remain 91/119 with 28 open. No Production launch or Demo purge ran.
