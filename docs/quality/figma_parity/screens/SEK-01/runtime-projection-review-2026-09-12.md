# SEK-01 projected activity evidence refresh — 2026-09-12

## Direct source

- Figma file: `Odl1Epn2u6lIEuIMmABT7o`
- Node: `6027:3579`
- Read through the official `get_design_context` tool on 2026-09-12.
- The source shows four counters (`7`, `2`, `2`, `14`), an active-requests panel, upcoming-viewings and recent-notifications panels, and the property-search CTA.

## Gap corrected

The SEK-01 visual E2E fixture returned only aggregate counters. That forced the component down its legacy summary-only fallback, so the checked snapshot did not exercise the current production overview projection or the Figma activity composition.

The focused fixture now returns the existing `recentRequests`, `upcomingViewings`, and `recentNotifications` contract fields, uses the directly observed source counter values, and supplies locale-correct profile identity. The test verifies all three activity panels and the CTA. It also removes the temporary keyboard-focus outline before capturing the visual baseline, after separately proving the focus behavior.

## Evidence

- `apps/web/tests/e2e/seeker-overview.spec.ts`
- `apps/web/tests/e2e/__snapshots__/seeker-overview.spec.ts-snapshots/seeker-overview-ar-desktop-ar-win32.png`
- `apps/web/tests/e2e/__snapshots__/seeker-overview.spec.ts-snapshots/seeker-overview-en-desktop-en-win32.png`
- Focused Playwright result: Desktop AR/EN, `4/4` passed.

This refresh makes the runtime evidence representative of the implemented safe projection. It does not close SEK-01 parity: the richer property fields and approved avatar/media prerequisites documented in `source-review-2026-09-12.md` remain unresolved, so the official `90/119` count is unchanged.
