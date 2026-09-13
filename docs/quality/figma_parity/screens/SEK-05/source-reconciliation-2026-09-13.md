# SEK-05 direct source reconciliation — 2026-09-13

The official Figma node `6027:4477` was read directly. The viewing requests screen now follows the source composition and canonical records: the upcoming, past, and cancelled tabs; the confirmed `Apartment SDT-1890 — First District`; the requested `Villa SDT-2103 — Corniche District`; their approved locations, dates, times, providers, provider types, and source property images.

The desktop layout uses the approved 1024px working grid with three equal tracks and places the two RTL cards in the source-side tracks. Status badges overlay the property images, date and time stay compact, provider identity has its own soft card, and the details action spans each card. The existing create, reschedule, cancel, validation, and authentication-failure flows remain reachable and were tested rather than replaced by static source content.

The affected AR/EN suite passed 8/8 after the client build. Its checks cover the 1551×863 visual baseline, safe projection, focus, mutations, fail-closed authentication, and horizontal-overflow geometry at 393, 768, and 1280 pixels. Client build, bundle budget, localization consistency, lint, and `git diff --check` passed.

The strict classification remains `PARTIAL_EXTERNAL`: the safe `/me` contract still has no approved avatar/media field, and the list contract does not expose aggregate totals for all three independently queried status tabs. The implementation does not invent the source counts or identity media. Strict totals therefore remain 91/119, with 28 screens open.
