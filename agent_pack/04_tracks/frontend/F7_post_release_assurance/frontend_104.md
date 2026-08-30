# frontend_104 - Final 131-Screen Integration and Release Readiness

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Kind | coordination |
| Sequence | 213 / 213 |
| Depends on | `frontend_103` |
| Scope | Final integration gates and evidence for the canonical 131-screen product |

## Purpose

Run the final approved Arabic RTL and English LTR integration gates from the current local repository state. Prior Public, Auth, Seeker, Provider, and Admin reports are historical provenance and must not be rewritten. The canonical Figma file is `Odl1Epn2u6lIEuIMmABT7o`; `0HBdTNGROmmpC6S7OYa3iJ` is forbidden.

## Required handling

- Reproduce the preserved Provider Web Vitest failures and either repair repository-owned behavior or prove a stale/environmental assertion with deterministic evidence.
- Run focused gates before one final 131-screen Playwright matrix in normal no-update mode.
- Use Arabic RTL and English LTR only. Do not execute or edit `zh-CN`.
- Preserve Seeker/Provider external exceptions and `ADM-18` / `ADM-54` source exceptions; do not invent nodes, projections, assets, or data.
- Keep `.env.local`, `.local/**`, Mongo data, test-results, snapshots, historical evidence, and unrelated user changes intact.
- Do not commit, push, deploy, reset, revert, stash, clean, or perform destructive cleanup.

## Acceptance

The final report must state the 131-screen totals, every remaining exception and owner, evidence/provenance limits, test and gate exit codes, runtime/deployment prerequisites, changed files, cleanup manifest, Agent Pack audit, local/remote divergence, atomic commit plan, and one of:

- `FULL_131_RECONCILED_RELEASE_READY`
- `FULL_131_READY_WITH_EXTERNAL_EXCEPTIONS`
- `FINAL_INTEGRATION_BLOCKED`
