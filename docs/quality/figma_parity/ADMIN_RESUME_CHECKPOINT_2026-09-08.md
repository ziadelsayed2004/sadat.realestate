# Admin repair checkpoint — 2026-09-08

## Implemented and checked locally

- Sidebar entry routes for property review, project review, and potential duplicates now render a selectable, filterable list when no record ID is provided. Explicit missing IDs retain the missing-record state.
- Property/report/request filter application replaces submitted filter values, so removing a search or status does not retain an omitted previous value. Request status tabs remain available after empty results.
- Earlier repairs include metric/filter spacing, project filter input/button ordering, reusable navigation icons, provider empty-result recovery, and protected community publish/hide with reason, audit, and optimistic concurrency.
- Generic settings editors now follow the measured 672px desktop column from the owning Figma frames, with logical RTL/LTR alignment and the existing compact single-column behavior.
- The production audit script now records successful API response statuses as well as errors. A successful page response alone is not proof that its API succeeded.

## Verification

- Broad desktop admin browser suite: 270/272 passed. The two failures were overview screenshot comparisons after intentional icon/layout changes, not failed functional assertions. Actual images were inspected before updating the two runtime regression baselines; the focused overview suite then passed 4/4. These snapshots are not Figma acceptance evidence.
- The focused admin layout, sidebar, and filter matrix: 60/60 passed across Desktop, Tablet, and Pixel 5 in Arabic and English. This includes compact-rail active-link visibility and empty-result filter recovery.
- The Web Vitest suite: 413/413 passed. The API route suite: 112/112 passed; the full API suite was rerun after the final changes with 556/556 passing. `npm audit --audit-level=high` reports 0 vulnerabilities after the `qs` lockfile update.
- API contract inventory: 187/187 runtime and policy routes match the implemented blueprint; OpenAPI and Postman validators are green.
- Final build, TypeScript, and lint checks completed successfully.
- Native local runtime smoke passed after starting the API, SSR web app, and seeded local data: `RUNTIME_SMOKE_OK` reported 6 properties, 4 developers, 6 articles, 4 community records, 2 About records, and 6 homepage properties; invalid API, private-file authorization, content encoding, and security headers were checked.
- The full `quality` aggregator is not green yet: all 556 API tests pass, but its coverage gate reports 78.23% lines and 79.88% functions against the configured 80% thresholds. The pack audit also retains the explicit ADM-54 design-source path exception. Neither result is a behavior-test failure.
- Logs are under `.local/`; browser evidence is under `apps/web/test-results/admin-review-entry`, `request-filter-recovery`, `admin-review-regression`, and `admin-overview-reviewed`.

## Design evidence and remaining limits

- Direct source dimensions are recorded in `direct-frame-inventory-2026-09-08.json`; detailed admin source nodes are recorded in `admin-direct-measurements-2026-09-08.json`. Source measurement inventory is separate from source-to-runtime parity.
- ADM-18 source frame was recovered as `6017:69276`. ADM-54 uses the previously owner-approved authored source, not a recovered Figma frame.
- ADM-18 was recaptured locally at its exact 1577 × 944 source size after the final admin repairs. Direct comparison remains open at 39.7325% material pixel difference because the recovered source uses a left-side Arabic admin shell while the supplied Production examples and current RTL runtime use the right side.
- The narrow frame `6029:48309` (296 × 6194) was inspected directly. Its seven 256 × 862 symbols are seeker sidebar variants; inspection of `6029:48308` shows logo, navigation, and account footer. It is not evidence of seven responsive page designs.
- The later user-supplied prototype points to Figma file `0HBdTNGROmmpC6S7OYa3iJ`, page `6017:4357`. Direct metadata records 402px mobile and 1024px tablet frames; `responsive-prototype-source-2026-09-08.json` supersedes the earlier missing-source conclusion.
- ADM-01 still differs materially from its source in data coverage and section contents. The source includes richer review queues and activity summaries; current runtime explicitly shows unavailable data where the overview API does not supply it. Do not replace missing data with fabricated source examples or mark parity complete.
- A read-only Production audit authenticated the supplied account as a real `admin` account and exercised all 51 sidebar routes on Desktop and Pixel 5. Pixel 5 width matched at 393px on every route, and the property APIs plus public property list/detail returned 200 with `installmentAvailable`. The reviewed candidate is pushed to `main` with the compact-rail fix, advertising contract inventory, and QA handoff updates; deployment remains outstanding because this workstation has no VPS SSH key or authenticated Hostinger control session. GitHub CI could not start its runner because of an account billing lock, so it produced no code-test result. Production still serves the pre-change asset hashes, and the old article query contract returns 400 until deployment.

This checkpoint is not release approval, a claim that all features were exhaustively tested, or a 100% Figma parity statement.

## Current geometry and regression baseline

- The desktop Admin header/sidebar geometry is now 64px, with the sticky sidebar pinned from `top: 64px`; the stale 72px sidebar test expectation was corrected and `admin-sidebar-responsive.spec.ts` passed 30/30.
- Settings, advertising, notifications, and audit content use a 24px desktop inset. Focused layout/settings tests passed 16 with 20 skipped. The advertising/notifications/filter/sidebar run passed 66, failed two stale header assertions, and skipped 28; after correcting those assertions, the sidebar rerun passed 30/30. Skips are not passes.
- Admin advertising, notifications/audit, and settings visual snapshots were regenerated after visual review of the intentional header/inset changes; the six desktop Arabic/English visual tests pass. They are implementation baselines and do not close the two open Admin source-parity rows.

## Latest live recheck superseding the earlier browser note

### Prototype source and field-spacing follow-up

- Reopened the supplied prototype with `get_design_context` at `6017:110792`: it is the 402px mobile homepage, not a sidebar variant. The page metadata contains 1024px tablet layouts as well. `responsive-prototype-geometry-2026-09-08.json` records 64 top-level objects with immediate child names and geometry; this includes isolated headers/components and is not a count of 64 complete screens or a runtime parity result.
- Direct Admin contact subframe `6017:71935` in file `Odl1Epn2u6lIEuIMmABT7o` specifies a 16px grid gap. Restored that gap in the shared settings field grid, which previously used zero and made adjacent controls touch.
- Reviewed the eight changed Arabic/English settings regression images. The subsequent normal Playwright run of `admin-page-layout.spec.ts` and `admin-settings-visual.spec.ts` passed 14 tests, skipped four desktop-only visual cases on responsive projects, and failed none. Layout checks ran on all six device/language projects. These tests use intercepted API fixtures and do not establish Production behavior or Figma parity.
- Production client/server builds and the bundle-budget check passed (491496 stylesheet bytes against 491520). This follow-up has not been deployed.

The supplied credentials still authenticate through the Production API as an explicit `admin` (`200` login, `200` overview and properties with the bearer token, and `200` refresh in the same cookie session). A fresh browser audit against the deployed pre-change bundle, however, lost the session after navigation: the first refresh returned `REFRESH_TOKEN_REUSED` and later refreshes returned `INVALID_REFRESH_TOKEN`, so that run recorded `0/102` authenticated pages. The candidate remains undeployed; repeat the browser audit after deployment before accepting the live gate.

## Admin settings field completion

- Direct Figma contexts for ADM-53 (`6017:72075`), ADM-55 (`6017:72206`), ADM-56 (`6017:72311`), ADM-57 (`6017:72413`), and ADM-58 (`6017:72503`) were used to replace the empty generic settings forms with their named property, advertising, SEO, privacy/security, display, population, and moderation controls.
- The controls preserve the existing protected settings contract: role/permission checks remain server-side, every mutation requires a reason and `expectedVersion`, and the repository records the audit entry atomically with the versioned update. An unconfigured namespace can now be created at version zero from the visible Figma-defined form.
- Focused component verification passed 15/15. The Arabic/English desktop visual matrix was regenerated after inspection and then passed normally 2/2; each locale visits ADM-50 through ADM-58, compares eight owning-frame pages, checks the active tab is visible, and retains the documented ADM-54 owner-authored source exception.
- Screenshot stability now loads the required Cairo weights explicitly and fixes form line-height before capture. It no longer waits for global `networkidle`, which could be held open by the external font connection after all application data had settled.
- These values are persisted through the generic Admin settings API. Their downstream use by public SEO metadata, privacy projections, homepage counters, moderation policy, property limits, and advertising validation is not established by this UI change and remains open cycle work.
