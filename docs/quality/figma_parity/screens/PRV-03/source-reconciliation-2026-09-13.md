# PRV-03 direct source reconciliation — 2026-09-13

The official Figma node `6017:19499` was read directly. The route now uses the source heading “إضافة عقار جديد” / “Add a new property,” its instructional description, the 768px centered canvas, and the eight-step rail after the heading. The provider navigation correctly highlights Add property throughout the wizard instead of My properties. The primary card uses the source radius, border, padding, and flat surface treatment.

The implemented create contract safely accepts localized name, slug, record kind, transaction type, provider source type, optional organization/project/parent relationships, and an audit reason. These controls remain functional and the successful create request is schema-shaped and owner-scoped. Figma additionally shows short and detailed descriptions, an external reference code, property type/category, active state, and featured state; those fields are absent from `propertyCreateSchema` and were not added as decorative controls that would silently discard input. The source-type ownership control remains visible because the current create contract requires it and the authenticated session does not expose a safe default.

The affected AR/EN suite passed 8/8 in baseline-update mode and 8/8 again in normal verification. It covers create, location resume/save, session denial, ownership denial, and explicit no-overflow containment at 1551, 768, and 393 pixels. Client build and bundle budgets, translation sync, typecheck, focused lint, and `git diff --check` passed.

PRV-03 remains `PARTIAL_EXTERNAL` for the source fields missing from the approved create contract. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
