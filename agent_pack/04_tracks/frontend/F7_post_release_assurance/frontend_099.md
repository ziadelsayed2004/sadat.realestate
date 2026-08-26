# frontend_099 — Public Exact Figma Parity Closure — PUB-01 through PUB-08

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | public exact visual parity |
| Kind | quality |
| Sequence | 208 / 208 |
| Depends on | `frontend_097` |

## Goal

Close the remaining repository-owned visual differences for the eight already audited Public screens using the cached canonical clone evidence. This is a second implementation pass and remains independent of new-screen discovery. It is also the explicit closure work associated with the Partial `frontend_098` final-gate task; it does not make the final platform gate complete.

## Screen IDs and canonical source

The task covers `PUB-01` through `PUB-08`. The canonical Figma file is exactly:

`FIGMA_FILE_KEY=Odl1Epn2u6lIEuIMmABT7o`

The forbidden source `0HBdTNGROmmpC6S7OYa3iJ` must not be queried or used.

| Screen ID | Clone page | Clone node | Runtime route | Evidence directory |
|---|---|---|---|---|
| PUB-01 | `6017:4352` | `6017:10847` | `/` | `docs/quality/figma_parity/screens/PUB-01` |
| PUB-02 | `6017:4352` | `6017:12095` | `/properties` | `docs/quality/figma_parity/screens/PUB-02` |
| PUB-03 | `6017:4352` | `6017:12693` | `/properties/:slug` | `docs/quality/figma_parity/screens/PUB-03` |
| PUB-04 | `6017:4352` | `6017:13838` | `/compare` | `docs/quality/figma_parity/screens/PUB-04` |
| PUB-05 | `6017:4352` | `6017:11366` | `/developers` | `docs/quality/figma_parity/screens/PUB-05` |
| PUB-06 | `6017:4352` | `6017:13155` | `/developers/:slug` | `docs/quality/figma_parity/screens/PUB-06` |
| PUB-07 | `6017:4352` | `6017:11467` | `/articles` | `docs/quality/figma_parity/screens/PUB-07` |
| PUB-08 | `6017:4352` | `6017:12560` | `/articles/:slug` | `docs/quality/figma_parity/screens/PUB-08` |

Use the already cached `figma.png`, `review.json`, and prior design-context records. Do not make duplicate source queries merely to repeat an existing capture.

## Dependencies and allowed roots

The formal dependency is `frontend_097`. `frontend_098` remains Partial while this closure task is active because it is the final release gate and has unresolved external and screen-evidence prerequisites.

Changes are limited to these roots:

- `apps/web/src/features/public/**`
- `apps/web/src/features/content/**`
- `apps/web/src/features/frontend_foundation/**`
- `apps/web/tests/e2e/**`
- `apps/web/tests/performance/**` when the focused performance gate requires it
- `apps/api/src/modules/public/**`
- `apps/api/src/modules/search/**`
- `apps/api/src/modules/compare/**`
- `apps/api/src/modules/organizations/**`
- `apps/api/src/modules/articles/**`
- `packages/contracts/**`
- `packages/ui/**` when a shared UI primitive owns the defect
- `apps/web/public/assets/clone/**`
- `scripts/**`
- `docs/quality/figma_parity/**`
- `agent_pack/**`

## Known defect inventory from the prior reviewed pass

The second pass must convert these categories into element-level records with expected value, runtime value, measured delta, owning file, and repair status for every screen:

- shared public header, navigation, container width, footer columns, CTA geometry, borders, radii, shadows, icons, and typography;
- homepage hero/search composition, section order, counters, category rail, featured cards, media treatment, and deterministic success content;
- property-listing title/control geometry, category rail, filters, card grid columns, card/image ratios, spacing, and pagination;
- property-details gallery ratio, summary and action geometry, amenities, location/services, advisory, project/provider panel, related cards, and contact form;
- comparison card/table geometry, table groups, control states, sticky comparison bar placement, and footer spacing;
- developer directory card ratios, search/sort controls, pagination, and media assets;
- developer profile hero, tabs, overview, stats, projects, properties, inquiry/contact, and media composition;
- article directory filters, search, card grid, CTA, and footer;
- article detail hero, title/meta, rich body structure, related articles, side rail where present, and footer;
- approved clone assets and API projections wherever a content-count or image difference is repository-owned;
- lazy-loading behavior: below-fold Production images remain lazy, only LCP/above-fold media is eager, and the capture harness scrolls and waits for lazy images.

## Mandatory per-screen evidence

Each screen retains or regenerates:

- `figma.png`
- `runtime-before.png`
- a genuinely new `runtime-after.png` captured only after an implementation or data/contract repair;
- `diff.png`, reviewed manually and numerically;
- `review.json` with the exact source, route, role, permissions, locale, direction, viewport, deterministic state, API projection, focused gates, defects, files, and final classification;
- `element-defects.json` containing the element/section, Figma expected value, runtime actual value, measured delta, owning component or CSS file, required repair, and status;
- `visual-metrics.json` containing the comparison dimensions, material-difference percentage, anti-aliasing-only percentage when applicable, and review decision.

Capture at the exact cached Figma frame width, with the approved viewport height, Arabic RTL and the required English and Simplified Chinese LTR checks. Wait for `document.fonts.ready`, decode all images after exercising lazy loading, and disable animation and transition variance before taking the screenshot. The deterministic success fixture must use the real API contract and approved assets; never add screenshot-only or fake Production data.

## Acceptance criteria

- [ ] PUB-01 through PUB-08 are handled in order; no PUB-09 discovery is permitted during this task.
- [ ] Every repository-owned material difference is repaired in the real React, CSS, API projection, contract, fixture, or approved asset path.
- [ ] No screen is considered processed merely because evidence or G5 capture exists, and no screen is marked repaired merely because code changed.
- [ ] Final screen classifications are only `REPAIRED_VERIFIED`, `VERIFIED_NO_CHANGE`, or `PARTIAL` with an exact external blocker.
- [ ] `runtime-after.png` is different from `runtime-before.png` whenever a repair is recorded.
- [ ] The new diff is reviewed directly; no broad mask or unjustified tolerance is used.
- [ ] A visual baseline is changed only after direct clone review and corrected-runtime review. The updated baseline is inspected and its normal visual test passes without `--ignore-snapshots`.
- [ ] Normal focused visual snapshots pass 8/8 without `--ignore-snapshots`.
- [ ] Focused functional, API/integration, accessibility, typecheck, lint, locale/direction, approved viewport, and performance gates pass.
- [ ] Below-fold Production media retains lazy loading; eager media is limited to LCP/above-fold content; the capture harness scrolls and waits for lazy media.
- [ ] Anti-aliasing/sub-pixel rasterization is the only remaining difference and its exact percentage is recorded, or the screen remains open for repair.
- [ ] The batch has eight visually verified screens, zero Partial screens, zero material visual differences, valid completion evidence, a consistent Finish Index, and a zero-error Agent Pack audit before this task can be marked Complete.
- [ ] Only after this task and all required gates are complete may the Agent Pack be synchronized to allow PUB-09 discovery.

## Verification

- affected contracts build and typecheck;
- affected web and API typecheck and lint;
- focused public Vitest and API/integration tests;
- focused Playwright functional, locale/direction, accessibility, approved-viewport, and normal visual tests;
- focused visual comparison and manual diff review for each screen;
- focused performance and bundle/lazy-loading gate;
- `node agent_pack/scripts/audit_pack.mjs`;
- `node agent_pack/scripts/sync_pack.mjs` only after the evidence and task state are updated.

## Current status rule

Remain `In Progress` or `Partial` while any material typography, spacing, geometry, content projection, interaction, accessibility, or performance defect remains. Do not create completion evidence or mark this task Complete until every acceptance criterion is true.
