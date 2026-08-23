# frontend_096 — Recover ADM-54 Approved Source and Perform Direct Comparison

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | design evidence |
| Kind | blocker |
| Sequence | 195 / 197 |
| Depends on | `frontend_091` |

## Goal

Replace the historical ADM-54 owner waiver with an approved local export and direct runtime comparison.

## Screen IDs

- `ADM-54`

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- `08_reality_sync/DECISION_LOG.md`

## Allowed Roots

- `docs/design_sources/final_screens/admin/**`
- `apps/web/src/features/admin_settings/**`
- `apps/web/tests/**`
- `agent_pack/**`

## Acceptance Criteria

- [ ] Obtain the approved ADM-54 export or exact accessible Figma frame from the Project Owner.
- [ ] Record provenance and SHA-256 in the design-source manifest.
- [ ] Compare the runtime route directly with the approved source.
- [ ] Repair material differences and run visual/accessibility evidence.
- [ ] Remove the waiver only after direct evidence exists.

## Verification

- design-source integrity audit
- targeted ADM-54 visual and accessibility tests
- Web typecheck, lint, tests, and build

This task is blocked until an approved ADM-54 source is supplied. A sibling-frame inference or generated image is not acceptable evidence.

