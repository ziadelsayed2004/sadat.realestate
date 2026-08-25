# frontend_091 — Restore and Verify the Approved Design Source Bundle

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | design evidence |
| Kind | quality |
| Sequence | 191 / 199 |
| Depends on | `frontend_090` |

## Goal

Restore every approved design artifact to its canonical repository path, preserve superseded recovery evidence, and verify the current source manifest without making an unsupported historical-byte or pixel-parity claim.

## Screen IDs

- Cross-surface design evidence for the canonical 131-screen registry.

## Source References

- `09_sources/DESIGN_SOURCE_MANIFEST.json`
- `01_product/SCREEN_REGISTRY.json`
- `01_product/SCREEN_COVERAGE.json`

## Allowed Roots

- `docs/design_sources/**`
- `agent_pack/**`

## Acceptance Criteria

- [x] Restore all 130 locally exported screen sources without generating or redrawing any source.
- [x] Restore the developer handoff, prototype flow hub, brand system, logo, and supplementary source.
- [x] Replace the incomplete PUB-01 recovery candidate with the stable direct export of approved Figma frame `6017:10847`, and preserve the candidate separately.
- [x] Preserve the historical PUB-01 checksum as provenance and explicitly avoid claiming that the current direct export reproduces the unavailable historical bytes.
- [x] Record the six direct Figma pages and the exact canonical frame inventory, including every unresolved owning-frame exception.
- [x] Preserve ADM-54 as owner-authored and do not fabricate a historical Figma export.
- [x] Make the Agent Pack integrity audit pass with zero source errors.
- [x] Run the required focused Web Vitest verification under the supported Node.js 24.x runtime.

## Verification

- `node agent_pack/scripts/audit_pack.mjs`
- `npm run test:vitest --workspace apps/web`
- source-manifest checksum verification

## 2026-08-25 Revalidation Note

- The prior PUB-01 recovery candidate had the approved dimensions but omitted lower homepage regions and contained a black tail. It is preserved at `docs/design_sources/recovery_candidates/public/PUB-01.recovered-incomplete.sha256-1a742ce1.png`.
- Two independent `download_assets` retrievals of Figma file `Odl1Epn2u6lIEuIMmABT7o`, page `6017:4352`, frame `6017:10847` produced identical SHA-256 `fcaf4e5ebebd29e85373b2562350f997a52d41c99031b630e3f7e7ac1592d190` and dimensions 6196 x 21509.
- The former manifest SHA-256 `bd96e921fa4bfa5ce9cbb7a76d87989b8663621d6975d68d1be1f9b147104dd2` remains recorded as historical provenance; no historical byte-parity claim is made.
- `docs/design_sources/figma/SCREEN_FRAME_INVENTORY.json` records 131 canonical screens, 129 direct historical owning frames, and the two owner-authored/no-independent-frame exceptions ADM-18 and ADM-54.
- Node.js 24.19.0 and npm 11.6.4 are active after a clean `npm ci`; the focused Web parity suite passes under the supported runtime.
