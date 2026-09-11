# SEK-09 personal profile density

- Source: official Figma MCP `get_design_context`, file `Odl1Epn2u6lIEuIMmABT7o`, node `6027:5677`, read 2026-09-11. The Apps connector required reauthentication; the official Figma server succeeded.
- Scoped desktop CSS removes the initial form margin, uses a 20px form gap, 16px identity divider padding, smaller identity typography, and places Save 20px below the panel. Existing first/last-name and read-only email contracts are preserved.
- Fresh Arabic runtime: `runtime-after-personal-density-v5.png`, 1551 × 862. Unmasked material difference: 7.1404%. The older `direct-figma-v4` was 19.3587%; this comparison includes intervening shared-shell repairs and must not be attributed solely to this patch.
- Direct visual inspection: panel and save action fit the viewport. Remaining differences include tab styling, heading alignment, field composition, input sizing/colors, and dynamic identity/avatar. The source still includes legacy phone/city/full-name composition. No canonical avatar was added to real user identities.
- Validation: production client/SSR build, translation check and bundle budgets passed. Profile Playwright desktop AR/EN: 8/8 passed, including save contracts, authentication boundary, keyboard focus and safe projections. Only the two personal-profile snapshots changed. No new mobile verification is claimed.
- Status remains PARTIAL_EXTERNAL; the official inventory remains 90/119. This review supplements the historical review.json; it does not close remaining repository visual differences or external identity requirements.

Next: finish the remaining SEK-09 visual differences using the working official Figma server, then verify Tablet/Pixel 5 and proceed through the remaining screen queue. Keep Demo enabled per the user's current phase decision.

## Controls and responsive follow-up

- `personal-controls-v6` implements the source's white active tab, 20px horizontal tab padding, 12px field labels, 16px field-grid gaps, and 42px rounded inputs (14px/20px text).
- Directly inspected runtime remains 1551×862. Overall material difference is **7.4851%**, up from 7.1404%; this is not a net pixel-parity improvement. Compact fields reduce card height while the source's avatar and legacy field composition remain different. Keep the source-sized controls; do not stretch them to compensate for unrelated composition differences.
- The existing responsive test now covers both preferences and personal routes, asserts `window.innerWidth === viewport.width`, no horizontal overflow, and a visible save button within horizontal bounds after scrolling. All 12 route/locale/device combinations passed (Desktop Chrome, Galaxy Tab S4, Pixel 5; AR/EN).
- Removed the blanket desktop-only skip from functional save/authentication tests. The desktop visual-baseline case alone remains desktop-only. All 8 newly enabled Tablet/Pixel 5 save-contract and denied-session cases passed; desktop's 6 functional/visual cases also passed. Total distinct passing cases: 26, with 4 desktop-only visual cases skipped on the other devices. This is intercepted browser-contract evidence, not live backend or Production verification.
- Production build, translation check, bundle budget and lint passed. Current visual repository defects are now recorded in review.json instead of its historical empty list.
- Remaining: reconcile the source composition with the approved email-only identity model, review heading/identity alignment and save icon/geometry, and then proceed to the other open screens. No Figma closure counter was increased.
