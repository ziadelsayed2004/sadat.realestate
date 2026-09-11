# ADM-18 density review — 2026-09-11

Source: Figma file `Odl1Epn2u6lIEuIMmABT7o`, screen node `6017:69276`, content node `6017:69859`. Direct source context and image are preserved in `source-context-2026-09-11.txt` and `source-content-2026-09-11.png`.

The request screen now groups common statuses and search in one compact toolbar. The full status and request-type filters remain available in a native expandable control. Search submits with Enter. Narrow layouts expand additional controls into document flow so their actions remain reachable. Request IDs remain available in the detail view; removing their second table line restores row density. The duplicate panel heading is removed from ADM-18 only.

| Desktop metric | Before | After | Source |
| --- | ---: | ---: | ---: |
| Heading size | 32px | 24px | 24px |
| Header row | 52.5px | 44px | 44px |
| First body row | 85px | 53px | 53px |
| Filter form | 115px plus separate status strip | 76px including common statuses | 72px |
| Table top in viewport | 517px | 264px | Not compared: approved navigation direction and local content differ |

Measurements are from the built application and real local API, at 1577×944 in both languages. Additional captures cover 768×1024 and Pixel 5 (393×851 CSS pixels), with equal innerWidth and document scrollWidth. Full geometry, computed fonts/colors and screenshot paths are recorded in `density-before-2026-09-11.json` and `density-after-2026-09-11.json`.

Six after-runs exercised common-status selection, additional status/type selection, clear, and Enter search reaching an empty result through real HTTP 200 responses, without document navigation. No business data was modified; login sessions were logged out. Separate component/E2E checks use fixtures and are not real-data journey closure evidence.

This is **not full Figma closure**. Remaining differences include the source CSV action, exact toolbar width/height/spacing, button/badge styling and date formatting, and a comparable six-row visual state. The right-hand Arabic navigation remains the approved product exception. Current captures contain local QA data, so pixel differences must not be interpreted as a like-for-like parity score. The official 90/119 count remains unchanged.
