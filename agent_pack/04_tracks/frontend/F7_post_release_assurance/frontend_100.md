# frontend_100 - Concurrent Owner-Clone Parity Coordinator - Public, Authentication, and Seeker

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | concurrent owner-clone parity coordination |
| Kind | coordination |
| Sequence | 209 / 209 |
| Depends on | `backend_149`, `frontend_097` |

## Purpose

Coordinate exactly three concurrent parity lanes against the owner-controlled Figma clone:

- `public_parity`
- `auth_parity`
- `seeker_parity`

The canonical source is:

`FIGMA_FILE_KEY=Odl1Epn2u6lIEuIMmABT7o`

The source key `0HBdTNGROmmpC6S7OYa3iJ` is forbidden. The coordinator preserves `frontend_099` as the honest Partial Public closure history and does not discover `PUB-09` until the Public closure criteria are met.

## Lane ownership

| Lane | Current cursor | Writable roots |
|---|---|---|
| public_parity | `PUB-03`, node `6017:12693`, `/properties/:slug`; revisit `PUB-01` and `PUB-02` before convergence | `apps/web/src/features/public/**` except shared `components.tsx`; `apps/web/src/features/content/**`; Public unit tests; `docs/quality/figma_parity/screens/PUB-01/**` through `PUB-08/**` |
| auth_parity | `AUTH-02`, node `6017:15835`, `/auth/register/seeker`; revisit `AUTH-01` before convergence | `apps/web/src/features/auth/**`; `apps/web/src/features/provider_auth/**`; Auth/Provider-Auth unit tests; `docs/quality/figma_parity/screens/AUTH-*/**` |
| seeker_parity | implementation cursor `SEK-10`, node `6027:6531`, `/seeker/settings`; evidence backlog starts at the first missing `SEK-*` record | `apps/web/src/features/seeker/**`; Seeker unit tests; `docs/quality/figma_parity/screens/SEK-*/**` |

Lane agents may write only their explicitly listed lane feature, unit-test, fixture, and screen-evidence paths. They do not write Agent Pack files, queue/checkpoint/ledger files, shared components, global styles/tokens, routers, contracts, API artifacts, root scripts, E2E/performance tests, visual baselines, or snapshots. The coordinator owns those paths and applies cross-lane requests serially.

## Source and execution scope

- Figma pages: Public `6017:4352`, Auth `6017:4353`, Seeker `6017:4354`.
- Locale scope: Arabic RTL and English LTR only.
- Public/Auth devices: Desktop, Tablet, Mobile.
- Seeker device: Desktop.
- No nested subagents, branch, or worktree.
- Reuse cached context and screenshots; do not repeat completed source retrieval.

## Acceptance criteria

- [ ] Exactly one Agent Pack task is `in_progress`; all three lane ledgers are current.
- [ ] Each lane processes one screen at a time and records exact node, route, role, permissions, locale, direction, viewport, deterministic state, API projection, defects, repairs, tests, and cursor.
- [ ] Every repository-owned visual, functional, API, accessibility, permission, and security defect is repaired in the correct owning path.
- [ ] Every after capture follows an actual measured repair and uses ready fonts, decoded images, stable animations, exact viewport, and reviewed diff evidence.
- [ ] Screens close only as `REPAIRED_VERIFIED` or `VERIFIED_NO_CHANGE`; `PARTIAL` requires an exact external blocker.
- [ ] Normal visual snapshots pass without `--ignore-snapshots` after direct clone review and intentional baseline approval.
- [ ] Focused lane gates pass before combined final gates; the full Playwright matrix is deferred until convergence.
- [ ] No Chinese execution or fabricated Figma asset/data is introduced.
- [ ] Agent Pack sync, audit, Finish Index, lane ledgers, and completion evidence are consistent before this task closes.

## Verification

- lane-specific typecheck and lint;
- focused unit, integration, API, functional, accessibility, permission, and security tests;
- exact source/runtime visual comparison and reviewed diff;
- normal visual snapshots without `--ignore-snapshots`;
- approved locale/direction/device matrices and focused performance gate;
- `node agent_pack/scripts/sync_pack.mjs`;
- `node agent_pack/scripts/audit_pack.mjs`;
- combined final gates only after Public, Auth, and Seeker converge.

## Current status

`In Progress`. Exactly three original lane agents are active. Public remains at the preserved `frontend_099`/`PUB-03` cursor; Auth is reviewing the existing `AUTH-02` pass-10 evidence; Seeker implementation remains at `SEK-10` while its evidence backlog is audited from the first missing record. No screen is complete based on code changes alone.
