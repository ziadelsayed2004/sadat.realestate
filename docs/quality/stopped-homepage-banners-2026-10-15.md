# Stopped homepage banners

Stopping an individual hero banner stores it as `draft`. The administrative
list already retained drafts, but the label and editor below the full list
made stopped banners difficult to find and edit.

- `/admin/banners?status=draft&lang=ar` opens the stopped/draft list.
- All banner statuses remain available, with filtering performed by the
  existing paginated API. Changing filters resets the page; pagination fetches
  current results, including when returning to initially rendered page one.
- Drafts are labelled “Draft / stopped” in English and “مسودة / موقوف” in Arabic.
- Preview and edit open above the list, scroll into view, and receive focus.
  Preview remains read-only and loads private draft images using the existing
  authenticated media client. Long titles wrap on narrow screens.
- A direct link opens display controls for global display and individual
  placements. Disabling display does not remove administrative access.
- Saving does not publish a draft. Explicit publishing refreshes a filtered
  list when the banner no longer matches its selected status.

## Validation

`tests/admin-home.vitest.test.tsx`: 40 passing tests, including bilingual
stopped-banner preview/edit/save, initial status filtering instead of
unfiltered server data, and server pagination/filter resets.

Real local browser/API/MongoDB journey without mocked responses:
`.tmp/banner-stopped-real.mjs`, results and screenshots in
`.tmp/banner-stopped-real/`. Uses a temporary administrator and uploaded image;
stops a live banner, checks it is absent from public home, disables global and
hero placement display, previews and edits in Arabic at 1440/390 and English
at 390, saves while hidden, enables display and its hero placement (which does
not publish drafts), then explicitly publishes to verify public visibility.
The existing API requires an enabled placement before publication.
Fixture records and original display settings are
restored in `finally`. Public production data is not modified.

Production client build: 1,983 bytes additional JavaScript over the
2,601,756-byte baseline. The aggregate allowance grows by one KiB; the existing
650 KiB per-chunk and 265 KiB route stylesheet limits remain unchanged.
