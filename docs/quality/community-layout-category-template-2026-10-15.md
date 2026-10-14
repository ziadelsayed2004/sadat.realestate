# Community card layout and category image template

Homepage community cards now place the avatar, author and time together at the
reading start, with the post-type badge opposite. English follows LTR and Arabic
RTL. Avatars retain their size when names wrap, titles wrap without overflowing,
body previews use up to three lines, and views align at the card bottom.
Desktop section height follows its content rather than a fixed height.

Categories/types without an image use the same new, local SVG illustration in
homepage cards, property-list filters and the administrative editor. Uploaded
image URLs retain priority. The former automatic Sadat gate asset is recognized
as the old default and rendered with the new template without changing stored
records. The editor's default/reset action saves the new template; predefined
images explicitly supplied by the backend are retained. Counts and filters are
unchanged. No database migration or production write is involved.

Validation:

- Production native build and unchanged bundle budgets pass. JavaScript is
  2,602,151 bytes and the public stylesheet route is 271,358 bytes. The layout
  adds 13 stylesheet bytes after removing obsolete/redundant rules.
- 66 existing homepage, public-listing and administrative master-data tests pass.
- Existing taxonomy browser journey passes in desktop English and mobile Arabic,
  including upload, delayed preview, reset, save and reload.
- `.tmp/community-layout-real/result.json`: actual local homepage, no mocked
  responses, Arabic/English at 1920/1440/1024/768/540/390/360/320 px. Geometry
  checks verify avatar/name direction, separated badges, title/body order,
  aligned desktop footers, contained section height and no overflow. Additional
  temporary DOM stress copy verifies long unbroken names/titles/bodies at 320 px.
  Screenshots in the same folder were visually inspected.
- `.tmp/category-template-real/result.json`: real local API/browser/MongoDB
  fixture creates a category/type without an image, checks homepage and filtered
  listing, uploads a scanned image and verifies public priority, then restores
  the template through the admin UI and verifies persistence. The legacy default
  renders the template. Fixture records and uploaded bytes are removed in
  `finally`. Production data is untouched.
