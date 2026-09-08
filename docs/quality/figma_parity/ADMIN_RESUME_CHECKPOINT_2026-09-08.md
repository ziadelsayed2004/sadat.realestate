# Admin repair checkpoint — 2026-09-08

## Implemented and checked locally

- Sidebar entry routes for property review, project review, and potential duplicates now render a selectable, filterable list when no record ID is provided. Explicit missing IDs retain the missing-record state.
- Property/report/request filter application replaces submitted filter values, so removing a search or status does not retain an omitted previous value. Request status tabs remain available after empty results.
- Earlier repairs include metric/filter spacing, project filter input/button ordering, reusable navigation icons, provider empty-result recovery, and protected community publish/hide with reason, audit, and optimistic concurrency.
- The production audit script now records successful API response statuses as well as errors. A successful page response alone is not proof that its API succeeded.

## Verification

- Broad desktop admin browser suite: 270/272 passed. The two failures were overview screenshot comparisons after intentional icon/layout changes, not failed functional assertions. Actual images were inspected before updating the two runtime regression baselines; the focused overview suite then passed 4/4. These snapshots are not Figma acceptance evidence.
- The focused admin layout, sidebar, and filter matrix: 60/60 passed across Desktop, Tablet, and Pixel 5 in Arabic and English. This includes compact-rail active-link visibility and empty-result filter recovery.
- The Web Vitest suite: 413/413 passed. The API route suite: 112/112 passed; the full API suite had already passed 556/556 before the final source-only sidebar change.
- API contract inventory: 187/187 runtime and policy routes match the implemented blueprint; OpenAPI and Postman validators are green.
- Final build, TypeScript, and lint checks completed successfully.
- The full `quality` aggregator is not green yet: all 556 API tests pass, but its coverage gate reports 78.23% lines and 79.88% functions against the configured 80% thresholds. The pack audit also retains the explicit ADM-54 design-source path exception. Neither result is a behavior-test failure.
- Logs are under `.local/`; browser evidence is under `apps/web/test-results/admin-review-entry`, `request-filter-recovery`, `admin-review-regression`, and `admin-overview-reviewed`.

## Design evidence and remaining limits

- Direct source dimensions are recorded in `direct-frame-inventory-2026-09-08.json`; detailed admin source nodes are recorded in `admin-direct-measurements-2026-09-08.json`. Source measurement inventory is separate from source-to-runtime parity.
- ADM-18 source frame was recovered as `6017:69276`. ADM-54 uses the previously owner-approved authored source, not a recovered Figma frame.
- ADM-18 was recaptured locally at its exact 1577 × 944 source size after the final admin repairs. Direct comparison remains open at 39.7325% material pixel difference because the recovered source uses a left-side Arabic admin shell while the supplied Production examples and current RTL runtime use the right side.
- The narrow frame `6029:48309` (296 × 6194) was inspected directly. Its seven 256 × 862 symbols are seeker sidebar variants; inspection of `6029:48308` shows logo, navigation, and account footer. It is not evidence of seven responsive page designs.
- The later user-supplied prototype points to Figma file `0HBdTNGROmmpC6S7OYa3iJ`, page `6017:4357`. Direct metadata records 402px mobile and 1024px tablet frames; `responsive-prototype-source-2026-09-08.json` supersedes the earlier missing-source conclusion.
- ADM-01 still differs materially from its source in data coverage and section contents. The source includes richer review queues and activity summaries; current runtime explicitly shows unavailable data where the overview API does not supply it. Do not replace missing data with fabricated source examples or mark parity complete.
- A read-only Production audit authenticated the supplied account as a real `admin` account and exercised all 51 sidebar routes on Desktop and Pixel 5. Pixel 5 width matched at 393px on every route, and the property APIs plus public property list/detail returned 200 with `installmentAvailable`. The latest candidate is pushed to `main` as `87514c7` (including `67c0e71`); deployment remains outstanding because this workstation has no VPS SSH key or authenticated Hostinger control session. GitHub CI could not start its runner because of an account billing lock, so it produced no code-test result. Production still serves the pre-change asset hashes, and the old article query contract returns 400 until deployment.

This checkpoint is not release approval, a claim that all features were exhaustively tested, or a 100% Figma parity statement.
