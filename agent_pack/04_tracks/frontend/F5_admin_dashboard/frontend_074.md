# frontend_074 — Property, Request, Ad, SEO, Privacy, and Display Settings

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F5_admin_dashboard |
| Area | admin_settings |
| Kind | frontend |
| Sequence | 174 / 188 |
| Depends on | `frontend_073` |

## Goal

Implement settings modules with optimistic concurrency and preview.

## Screen IDs

- `ADM-53`
- `ADM-54`
- `ADM-55`
- `ADM-56`
- `ADM-57`
- `ADM-58`

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- Screen ID `ADM-53` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `ADM-54` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `ADM-55` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `ADM-56` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `ADM-57` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Screen ID `ADM-58` through `09_sources/DESIGN_SOURCE_MANIFEST.json`.
- The Project Owner-approved `DESIGN-EXCEPTION-ADM-54` in `08_reality_sync/DECISION_LOG.md` waives only the unavailable direct ADM-54 comparison; its original external provenance remains authoritative and the approved substitute Admin design-system, sibling-frame, locale/direction, Desktop, functional, permission, visual-regression, and accessibility evidence is mandatory.

## Allowed Roots

- `apps/web/src/features/admin_settings/**`
- `apps/web/src/routes/**`
- `apps/web/tests/**`
- `packages/ui/**`
- `packages/contracts/**`
- `agent_pack/**`

Any file outside these roots requires an explicit necessity note in completion evidence. Never expand scope silently.

## Acceptance Criteria

- [ ] Inspect the current runtime and never replace existing truth with an assumption.
- [ ] Implement only the selected scope and document every unresolved dependency or decision.
- [ ] Do not introduce secrets, production data, or unsupported claims.
- [ ] Match every selected Screen ID to its approved frame and record the exact reference in evidence; for ADM-54 only, apply `DESIGN-EXCEPTION-ADM-54`, record that direct comparison was not performed, and provide the approved substitute evidence without claiming pixel-perfect fidelity.
- [ ] Use implemented backend contracts only; production mocks and invented endpoints are forbidden.
- [ ] Complete applicable Loading, Empty, Error, Retry, Success, and permission variants.
- [ ] Verify Arabic RTL plus every other supported locale, direction, approved device scope, and applicable UI tests.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `targeted Playwright/visual/a11y checks`

A missing command or prerequisite is recorded as `Blocked — prerequisites unavailable`; it is never reported as Passed.

## Finish

Create `07_finish/frontend_074/completion.json`, then use the status tool and run sync, audit, and selector. Stop after this task.
