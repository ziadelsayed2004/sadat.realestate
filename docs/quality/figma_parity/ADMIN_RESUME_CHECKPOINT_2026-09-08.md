# Admin repair checkpoint — 2026-09-08

## Implemented and checked locally

- Sidebar entry routes for property review, project review, and potential duplicates now render a selectable, filterable list when no record ID is provided. Explicit missing IDs retain the missing-record state.
- Property/report/request filter application replaces submitted filter values, so removing a search or status does not retain an omitted previous value. Request status tabs remain available after empty results.
- Earlier repairs include metric/filter spacing, project filter input/button ordering, reusable navigation icons, provider empty-result recovery, and protected community publish/hide with reason, audit, and optimistic concurrency.
- The production audit script now records successful API response statuses as well as errors. A successful page response alone is not proof that its API succeeded.

## Verification

- Broad desktop admin browser suite: 270/272 passed. The two failures were overview screenshot comparisons after intentional icon/layout changes, not failed functional assertions. Actual images were inspected before updating the two runtime regression baselines; the focused overview suite then passed 4/4. These snapshots are not Figma acceptance evidence.
- New sidebar entry, filter spacing, and provider empty recovery tests: 18/18 passed across desktop/tablet/mobile and Arabic/English.
- Request search empty-result recovery: 6/6 passed across the same matrix.
- Existing property/project/request browser flows after the final changes: 14/14 passed.
- Final admin layout, sidebar, and advertising scheduling matrix: 36/36 passed across Desktop, Tablet, and Pixel 5 in Arabic and English.
- Property/project/request unit/component tests: 18/18 passed.
- Final build and TypeScript checks completed successfully. Lint was rerun after removing unused article projection variables.
- Logs are under `.local/`; browser evidence is under `apps/web/test-results/admin-review-entry`, `request-filter-recovery`, `admin-review-regression`, and `admin-overview-reviewed`.

## Design evidence and remaining limits

- Direct source dimensions are recorded in `direct-frame-inventory-2026-09-08.json`; detailed admin source nodes are recorded in `admin-direct-measurements-2026-09-08.json`. Source measurement inventory is separate from source-to-runtime parity.
- ADM-18 source frame was recovered as `6017:69276`. ADM-54 uses the previously owner-approved authored source, not a recovered Figma frame.
- The narrow frame `6029:48309` (296 × 6194) was inspected directly. Its seven 256 × 862 symbols are seeker sidebar variants; inspection of `6029:48308` shows logo, navigation, and account footer. It is not evidence of seven responsive page designs.
- The later user-supplied prototype points to Figma file `0HBdTNGROmmpC6S7OYa3iJ`, page `6017:4357`. Direct metadata records 402px mobile and 1024px tablet frames; `responsive-prototype-source-2026-09-08.json` supersedes the earlier missing-source conclusion.
- ADM-01 still differs materially from its source in data coverage and section contents. The source includes richer review queues and activity summaries; current runtime explicitly shows unavailable data where the overview API does not supply it. Do not replace missing data with fabricated source examples or mark parity complete.
- A read-only Production audit authenticated the supplied account as `ADM-01` and exercised all 51 sidebar routes on Desktop and Pixel 5. Pixel 5 width matched at 393px on every route, and the property APIs returned 200. Deployment of the local candidate remains outstanding because this workstation has no authenticated GitHub push session or VPS SSH key.

This checkpoint is not release approval, a claim that all features were exhaustively tested, or a 100% Figma parity statement.
