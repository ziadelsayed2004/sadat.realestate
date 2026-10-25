# Exact property prices and optional rounding — 2026-10-25

The owner entered EGP 3,250,000 but saw “3.3 million”. Several public views independently divided EGP amounts by one million and formatted one decimal. This was a display calculation, not a write to the property price.

The default public presentation now formats the complete stored amount, including its fractional part. Homepage cards, search, property summaries/related cards, comparison cards/tables and article property suggestions share that formatter. No amount or currency is rewritten.

Administration: **General settings → Display settings → Round property prices to millions** (`/admin/settings/display?lang=ar#admin-settings-round_property_prices`). The option is off by default. When enabled, EGP prices of at least one million use one-decimal millions with an explicit “Approx.” / “حوالي” label. Other currencies and prices below a million remain exact. Search/filter bounds, installment data, structured-data prices and comparison difference detection continue to use the original amounts.

The versioned administrative setting requires an actual boolean and existing settings permissions/auditing. Only its safe boolean projection is exposed in public bootstrap. Server rendering reads the preference per request, serializes it for matching hydration and falls back to exact presentation if settings are unavailable. The browser shares bootstrap refresh with the existing contact loader, including focus refresh; the admin save refreshes the same public data. No mutable server-wide rounding preference is used.

Verification:

- 15 focused settings/bootstrap API tests passed, including default-off, boolean validation and versioned on/off persistence.
- 172 distinct focused component/formatting cases passed across the homepage, listings, details, articles, comparison and settings. Cases cover 3,250,000, 3,250,001, fractional prices, Arabic/English and currencies unaffected by approximation. Comparison retains a real price difference even if two rounded labels match.
- The local native browser script `node scripts/verify-exact-price-local.mjs` saves the real admin control, checks bootstrap/SSR/hydrated home/list/detail/comparison output in Chromium and WebKit at phone/laptop widths, confirms structured data and stored amounts stay exact and checks fractional prices. It restores the original local display setting and removes its property fixture. Evidence: [latest native result](guide-runs/exact-price-local-latest.json).
- OpenAPI and the searchable owner guide validation passed. Full lint/types/tests/build run in the normal protected push on the committed revision.

No production settings or property records were edited. GitHub delivery still requires the standard server update to become visible on production.
