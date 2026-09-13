# SEK-06 direct source reconciliation — 2026-09-13

The official Figma node `6027:4748` was read directly. The saved-properties screen now renders the four canonical favorites already represented by the approved API projection and Demo seed: `SDT-1234`, `SDT-0892`, `SDT-0234`, and `SDT-0567`. Their official property and provider images, localized titles and locations, prices, features, view counts, badges, provider identities, and verification state are sourced from repository assets and contract fields.

The runtime now uses the source-aligned 1024px three-column desktop canvas. Property badges and public codes overlay the images, location precedes the title, the provider row carries its approved image and type, compare is an interactive pressed-state control, and view/remove actions sit below each card. The previous saved-date presentation was removed from the visual card because it is absent from the official frame; the safe contract field remains available to the client.

The affected AR/EN suite passed 8/8 after the client build. It covers the 1551×1228 visual baseline, four-item safe projection, compare toggle, removal and unavailable responses, empty state, fail-closed authentication, focus, and horizontal-overflow geometry at 393, 768, and 1280 pixels. Client build and bundle budget, lint, and `git diff --check` passed.

The canonical property/provider media blocker is resolved. The strict classification remains `PARTIAL_EXTERNAL` only because the safe `/me` account projection still has no approved seeker avatar/media field, so the header and navigation identity image cannot be proven through live account data. Strict totals remain 91/119, with 28 screens open.
