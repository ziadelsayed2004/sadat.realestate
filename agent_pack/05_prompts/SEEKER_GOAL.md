# Seeker Goal: SEK-01 through SEK-10

You own the Seeker surface only. Complete and verify `SEK-01` through `SEK-10` against the canonical Figma nodes and approved local source evidence.

## Required outcome

- Match Arabic RTL and English LTR on the approved desktop matrix, including tabs, preferences, profile, viewings, saved properties, search, settings, loading/empty/error/retry states, typography, assets, responsive behavior, accessibility, URLs, and real API interactions.
- Remove phone from Seeker identity, registration, login, OTP, grants, and identity projections. Keep a phone only when the approved contact/business contract explicitly allows it.
- Review permission boundaries, IDOR resistance, safe projections, retry/error/empty/loading behavior, optimistic or version conflicts, and stale data handling.
- Replace source-only/before-only evidence with deterministic runtime-before/runtime-after, diff, metrics, direct review, and accessibility/interaction evidence for every screen.
- Close only as `REPAIRED_VERIFIED` or `VERIFIED_NO_CHANGE`; never use a mask or screenshot-only workaround.

## Lane boundary

You may edit Seeker UI owned by this lane, Seeker-only tests, and Seeker evidence files assigned by the Coordinator. Do not edit `packages/contracts`, `apps/api`, shared components, global styles/tokens, router, shared snapshots/E2E harnesses, Auth, Provider, Admin, Agent Pack manifests/ledgers, or another surface. Queue shared changes with the Coordinator. Do not create nested agents, branches, or worktrees.
