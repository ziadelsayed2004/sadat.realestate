# Homepage search option width — 2026-10-14/15

The property/unit choices and installment checkbox previously occupied only their intrinsic width, leaving unused space across the search panel. The options row now uses a two-column grid spanning the panel: two thirds for the equally distributed record-kind choices and one third for the installment control. Both controls stretch within their columns. At widths up to 540px, they stack at full width. Labels have a 44px minimum target height, and the extra row margins are removed.

Following the user's refinement, widths from 768px place both groups inside one shared outer border without a divider. The title, kind choices and installment checkbox align on the same horizontal center line. The individual desktop borders are removed. Phone widths retain the separate full-width frames and stacked layout from the first adjustment.

Validation: production build and existing bundle budgets passed. A real local browser check without mocked responses passed at Arabic widths 1920, 1440, 768, 390 and 320px and English widths 1440 and 390px. It measured full content-width coverage, equal kind-label widths, desktop shared-border geometry without a divider and vertical center alignment, retained phone borders and stacking, and no horizontal overflow, and confirmed unchanged unit/installment form values. Desktop Arabic/English and mobile Arabic screenshots were inspected after the homepage intro finished. No new implementation-mirroring unit tests were added for this CSS-only adjustment.

Evidence: `.tmp/home-search-layout-real/result.json`, screenshots in that directory, `.tmp/home-search-alignment-real.log`, and `.tmp/home-search-alignment-local.log`. No production deployment was performed.
