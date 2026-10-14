# Provider map coordinates — 2026-10-14

## Behavior

- Pasting a Google Maps or Apple Maps pin link fills latitude and longitude automatically. Existing links without coordinates are also resolved when opening the location step.
- Recognizes explicit query/path coordinates and Google place pins. A place's camera position is not substituted for its actual pin; text addresses are not geocoded.
- The authenticated, owner-scoped `POST /api/v1/provider/properties/:propertyId/map-coordinates` resolves supported short map links. It does not save the property. Every redirect is checked against the existing HTTPS map-link allowlist; requests only target map short-link hosts, stop after five hops or six seconds, and do not download map page bodies.
- Loading and unresolved states are explained in Arabic and English. Saving waits for resolution; an unresolved link can still be saved alone. Manual corrections remain available. Changing links clears old coordinates; stale responses and responses after manual edits cannot replace current input.
- Fixed an existing first-coordinate save failure: Mongoose stripped the immutable GeoJSON `type` during updates, leaving an invalid point for the MongoDB geospatial index. `type` still only accepts `Point`; the API continues to accept bounded numeric latitude/longitude only.

## Validation

- API targeted tests: 20 passed, including URL parsing, redirect allowlisting/hop limits, ownership/authentication, and a regression exercising Mongoose update casting of a first GeoJSON point.
- Web wizard tests: 22 passed, including Arabic/English automatic fill and save, unresolved fallback, stale results, and manual corrections.
- Real local browser/API/MongoDB checks: Arabic at 1440px and English at 390px, with no mocked responses. The actual short map link supplied in the screenshot resolves successfully. Verified automatic fill, no write before Save, persisted GeoJSON longitude/latitude order, reopening saved values, Apple Maps, manual override persistence after reload, clearing old coordinates for an unresolved new link, and no horizontal overflow. Also opened an existing short link without coordinates and confirmed automatic fill.
- All synthetic accounts, properties, areas, credentials, sessions, and audit fixtures were removed. Evidence is in ignored `.tmp/provider-map-real/result.json` and screenshots.
- Typecheck, lint, build, guide consistency, API inventory audit, OpenAPI and Postman checks passed. The normal pre-push gate runs before upload.
- Client JavaScript grows by about 4.1 KB from the 2,575,366-byte baseline. Total budget increases by a bounded 4 KiB; individual chunk and route stylesheet limits remain unchanged.

No production records were changed and no production deployment was performed.
