# SEK-07 direct source reconciliation — 2026-09-13

The official Figma node `6027:5319` was read directly. The notifications screen now renders the eight canonical records in source order, with four unread records, localized titles and messages, relative timestamps, source references, safe localized links, colored type icons, and accessible unread controls.

The runtime now uses the source-aligned 768px continuous list rather than standalone state cards. A global `[data-state]` rule had been turning every notification row into a separate large card; notification rows are now excluded and locally guarded against that state-surface styling. The affected geometry test asserts zero row gap, margin, and radius as well as containment and icon/dot order at 1551, 800, and 393 pixels in Arabic and English.

After rebuilding the client bundle, the affected AR/EN suite passed 8/8. It covers the eight-record safe projection, four-record unread filter, mark-one and mark-all mutations, localized safe links, empty state, fail-closed authentication, keyboard focus, visual baselines, and horizontal-overflow geometry. Typecheck, lint, client build/bundle budget, and `git diff --check` passed.

The strict classification remains `PARTIAL_EXTERNAL` because the safe `/me` account projection still has no approved seeker avatar/media field. Strict totals remain 91/119, with 28 screens open. No Production launch or Demo purge ran.
