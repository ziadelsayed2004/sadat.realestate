# Provider main-property picker — 2026-10-14

## Behavior

- Replaced “Parent property ID” / “معرّف العقار الأب” with “Building or main property” / “العمارة أو العقار الرئيسي”. The example explains an apartment inside a registered building.
- A standalone apartment, shop or plot can use “Standalone property” without this field. A linked unit chooses its main property by name; it may leave the main property empty if a project was supplied, preserving the existing create contract.
- Replaced free-text ID entry with the provider's authenticated property list, a debounced name search, and navigation through bounded 100-record pages. New choices exclude units, the current record, inactive records and archived records. No administrator endpoint is used.
- The saved reference stays visible and unchanged across searches, paging and list failures. Its name is loaded through the existing owner-scoped property detail endpoint when outside the current page. Failures offer retry without discarding the selection.
- Updated Arabic/English labels, validation guidance, and the account guides. The source-link grid aligns fields at their natural height on desktop.

## Validation

- Wizard tests: 26 passed, including authenticated list/search parameters, named selection and correct create payload in both locales, saved selection across paging/search/failure, and excluding the current record.
- Real local browser/API/MongoDB, with no mocked responses: Arabic at 1440px and 390px, English at 390px. Added 101 synthetic child units ahead of the main building to verify the second page is reachable. Confirmed name search, excluding other owners/units/archived/inactive records, creating a linked unit with the correct persisted parent ID, reopening the unit with the parent's name selected, preserving it during an unmatched search, natural field heights and no horizontal overflow.
- All synthetic accounts, properties, credentials, sessions and audit records were removed. Evidence: ignored `.tmp/provider-parent-real/result.json` and screenshots.
- Typecheck, lint, build and guide consistency checks passed. The normal full pre-push gate runs before upload.
- Measured client JavaScript: 2,586,792 bytes, approximately 7.5 KB above the 2,579,360-byte baseline. The total budget increases by a bounded 8 KiB; individual-chunk and route-CSS limits remain unchanged. Largest JavaScript chunk: 655,174 bytes; largest route CSS: 270,122 bytes.

No API contract changes, production data changes or production deployment.
