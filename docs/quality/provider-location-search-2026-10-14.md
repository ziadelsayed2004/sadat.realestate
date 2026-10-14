# Provider location search and saved selection

The supplied screenshot contains an active `الح` search, so the native dropdown displays matching district names rather than the whole active catalog. The clear-search action now appears between the search box and the dropdown, where opening the dropdown does not obscure it. A live result count explains the filtering. Existing saved selections remain visible without being changed by typing or clearing a search.

Search accepts common area/district terminology: for example, `المنطقة الأولى` can match an existing `الحي الأول`. This uses only registered catalog entries and does not invent missing districts. The provider guide explains clearing filters and requesting administrative addition/activation of an absent area.

Validation:

- 13 search tests and 19 property-wizard tests passed, including area/district terminology, partial matches, unrelated searches, the clear action appearing before the selector, result counts and preservation of the saved selection.
- A real local provider account, MongoDB, API and browser were used without mocked responses. Arabic desktop (1440px) and English mobile (390px) both passed: filtering, clearing to restore the complete active list, preserving an existing selection outside the filtered matches, choosing by area terminology, saving the correct ID and reopening the property with that selection intact.
- Browser screenshots were inspected and no horizontal overflow or page JavaScript errors were observed. Synthetic account, credentials, sessions, locations, property and mutation audit records were removed.
- Type checks, lint and the web build/bundle budget passed. No backend endpoints or production location data were changed.

Evidence: `.tmp/provider-location-real/result.json`, screenshots in `.tmp/provider-location-real/`, and targeted `.tmp/provider-location-*` logs. Full pre-push verification runs against the committed change; production deployment remains separate.
