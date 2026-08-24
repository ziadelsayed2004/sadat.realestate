# frontend_096 — Author and Verify the New ADM-54 Request Settings Design

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | admin design evidence |
| Kind | quality |
| Sequence | 195 / 197 |
| Depends on | `frontend_091` |

## Goal

Author an owner-reviewable local ADM-54 Request Settings design and compare the implemented route against it. This is a new owner-authorized design, not a recovered historical Figma frame.

## Screen IDs

- `ADM-54`

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- `01_product/SCREEN_REGISTRY.json`
- `01_product/SCREEN_COVERAGE.json`
- `08_reality_sync/DECISION_LOG.md`
- `docs/design_sources/final_screens/admin/ADM-53.png`
- `docs/design_sources/final_screens/admin/ADM-55.png`

## Owner Decision

- Decision ID: `DESIGN-DECISION-ADM-54-AUTHOR-001`
- Authorization: Project Owner authorized authoring a new official local design.
- Primary review scope: Arabic RTL, Admin Desktop.
- Functional truth: implemented Request Settings API and current PRD; only server-provided dynamic values may become editable fields.
- Historical provenance: the original Figma/Drive references remain recorded, but the historical ADM-54 frame was not recovered.

## Allowed Roots

- `docs/design_sources/final_screens/admin/**`
- `apps/web/src/features/admin_settings/**`
- `apps/web/tests/**`
- `agent_pack/**`

## Acceptance Criteria

- [ ] Create a deterministic owner-authored local source and record its provenance, decision ID, checksum, locale, direction, and Desktop viewport.
- [ ] Keep the original Figma/Drive provenance and explicitly label the new source as owner-authored rather than recovered.
- [ ] Render the implemented `/admin/settings/requests` route with a deterministic non-production API fixture and record a traceable runtime screenshot.
- [ ] Compare the runtime against the new source and repair material Request Settings differences within the allowed roots.
- [ ] Verify dynamic settings projection safety: no fabricated request rules or production values, no private data, and no unauthorized mutation path.
- [ ] Verify Arabic RTL primary behavior plus English and Simplified Chinese LTR behavior, Admin Desktop scope, loading/empty/error/retry/permission/conflict states, and accessibility.
- [ ] Obtain and record explicit owner approval of the authored source and runtime comparison before marking this task Complete.
- [ ] Do not claim recovery of the historical Figma frame or direct comparison against the unavailable historical source.

## Verification

- design-source integrity and checksum audit
- targeted ADM-54 visual review capture and accessibility tests
- Admin settings route/RBAC and empty-projection tests
- Web typecheck, lint, tests, and build
- Agent Pack audit

The task remains Partial after authoring and implementation work until the owner-review gate is explicitly approved.
