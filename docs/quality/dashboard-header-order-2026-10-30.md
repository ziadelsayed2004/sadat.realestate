# Dashboard header and sidebar language

- All administrator, seeker, owner, office and developer dashboards use a single reading order: navigation toggle, notifications, account menu. Arabic starts at the right edge; English starts at the left. The logo sits at the other edge and search remains available on wider screens.
- Language selection is in each dashboard sidebar. It uses the existing locale callback/event, preserving the current route and query parameters.
- The menu controls the desktop rail as well as the compact drawer. Breakpoint changes reset to an open desktop rail or closed compact drawer. Compact drawers lock background scrolling and close on Escape or backdrop activation; Escape first dismisses an open account/language/notification menu.
- Provider compact navigation now uses the same side drawer as the other dashboards, including language and sign-out controls. Header height is 64px across dashboards.

## Verification

- Focused administrator, provider and seeker overview tests: 45 passed.
- Type checking, lint and production client/server build passed. Existing JavaScript and route CSS budgets passed without increases.
- Browser regression covers five account types in Arabic and English at 320px, 820px and 1440px: control geometry/order, desktop collapse and compact drawer, account menus, language changes and page overflow. Existing account/settings/sign-out journeys are included.
- Generated captures and logs remain in ignored local test output directories.

The change is source-only; production deployment is a separate operation.
