# PRV-22-2 source reconciliation — 13 September 2026

The approved desktop export for Figma node `6028:11875` at 1577×1035 was reviewed against the provider contact-settings tab. No separate responsive owning frame is recorded for this screen. The settings heading, tab rail, and contact card now share the canonical 672px canvas; the extra provider eyebrow is removed, the source description is restored, the active tab uses the source white treatment, and the save action is centered at its source-sized width.

The runtime keeps the authenticated, versioned `update_contact` mutation and only renders the approved WhatsApp, office-address, and website fields. Their desktop grid preserves the source positions while leaving the absent phone position empty instead of fabricating a field. At the mobile breakpoint the available controls collapse to one column.

The canonical separate phone field is absent from the provider settings projection and patch contract, so it was not introduced. PRV-22-2 remains `PARTIAL_EXTERNAL` pending that approved field.

Intentional AR/EN desktop baseline update passed 2/2 and final no-update verification passed 2/2, including the real contact-save path. Responsive containment passed 4/4 on Tablet and Pixel 5 in AR/EN. The Arabic desktop result was visually reviewed. Translation check, client build and bundle budgets, typecheck, focused lint, and diff checks passed. Strict Figma totals remain 91/119 with 28 open. No Production launch or Demo purge ran.
