# SEK-09 personal profile density

- Source: official Figma MCP `get_design_context`, file `Odl1Epn2u6lIEuIMmABT7o`, node `6027:5677`, read 2026-09-11. The Apps connector required reauthentication; the official Figma server succeeded.
- Scoped desktop CSS removes the initial form margin, uses a 20px form gap, 16px identity divider padding, smaller identity typography, and places Save 20px below the panel. Existing first/last-name and read-only email contracts are preserved.
- Fresh Arabic runtime: `runtime-after-personal-density-v5.png`, 1551 × 862. Unmasked material difference: 7.1404%. The older `direct-figma-v4` was 19.3587%; this comparison includes intervening shared-shell repairs and must not be attributed solely to this patch.
- Direct visual inspection: panel and save action fit the viewport. Remaining differences include tab styling, heading alignment, field composition, input sizing/colors, and dynamic identity/avatar. The source still includes legacy phone/city/full-name composition. No canonical avatar was added to real user identities.
- Validation: production client/SSR build, translation check and bundle budgets passed. Profile Playwright desktop AR/EN: 8/8 passed, including save contracts, authentication boundary, keyboard focus and safe projections. Only the two personal-profile snapshots changed. No new mobile verification is claimed.
- Status remains PARTIAL_EXTERNAL; the official inventory remains 90/119. This review supplements the historical review.json; it does not close remaining repository visual differences or external identity requirements.

Next: finish the remaining SEK-09 visual differences using the working official Figma server, then verify Tablet/Pixel 5 and proceed through the remaining screen queue. Keep Demo enabled per the user's current phase decision.
