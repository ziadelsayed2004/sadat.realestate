# Public Goal: PUB-01 through PUB-12

You own the Public surface only. Complete and verify `PUB-01` through `PUB-12` against the canonical Figma node and the approved local source evidence.

## Required outcome

- Match Arabic RTL and English LTR across desktop, tablet, and mobile.
- Match layout, typography, spacing, colors, assets, responsive behavior, loading/empty/error/success states, accessibility, interactions, URLs, and real API behavior.
- Verify property details and the map action. Render the map button only when a validated HTTPS `mapUrl` exists; open it in a new tab with `noopener noreferrer`. Do not create a map URL from coordinates.
- Preserve property/business contact phone or WhatsApp only where the approved contract explicitly exposes it. It is not an authentication identifier.
- Produce deterministic runtime-before/runtime-after, diff, metrics, review, and screen-ledger evidence for every screen. Use only `REPAIRED_VERIFIED` or `VERIFIED_NO_CHANGE` for closure.

## Lane boundary

You may edit `apps/web/src/features/public/**`, Public-only tests, and Public evidence files assigned by the Coordinator. Do not edit `packages/contracts`, `apps/api`, shared components, global styles/tokens, router, shared snapshots/E2E harnesses, Agent Pack manifests/ledgers, or another surface. Queue shared changes with the Coordinator. Do not create nested agents, branches, or worktrees.

Close `PUB-01` through `PUB-08` first, then `PUB-09` through `PUB-12`, while preserving unrelated user changes.
