# Sadat Real Estate Platform

MERN monorepo for the Arabic-first Sadat Real Estate public site, authentication and onboarding, Seeker workspace, Property Provider dashboard, and Admin dashboard.

## Runtime

- Node.js `>=24 <25`
- npm `>=11 <12`
- TypeScript, Express, MongoDB/Mongoose, React 19, and Vite SSR
- Arabic (`ar`) is the primary RTL locale; English (`en`) and Simplified Chinese (`zh-CN`) are LTR locales.

## Workspaces

- `apps/api` — versioned Express API
- `apps/web` — Vite SSR frontend and protected SPA surfaces
- `packages/contracts` — shared runtime and TypeScript contracts
- `packages/ui` — reusable UI package boundary
- `packages/config` — workspace policy and quality tooling

## Start

```bash
npm ci
npm run env:check
npm run quality
```

Use `.env.example` files only as templates. Never read, commit, or print a real `.env`.

## Agent Pack

The English-only execution graph is in `agent_pack/`. Run:

```bash
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

Read `agent_pack/step_info.json`, execute one dependency-ready task, verify it, create completion evidence, synchronize the pack, and stop.

## Design Sources

Approved visual exports and source artifacts are stored outside the English-only Agent Pack under `docs/design_sources/`. Their immutable checksums, Figma prototype references, Drive reference, Screen ID mappings, and availability state are recorded in `agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json`.

The runtime product logo is the approved Sadat Real Estate artwork. DOT Studio artwork is supplier identity and must not be used as the product brand.

## Current Boundary

The historical implementation graph is preserved, but the post-release completion audit found that complete visual parity, a full live API matrix, and production-parity infrastructure are not yet proven. The Agent Pack now contains 197 tasks, including a dedicated post-release assurance phase. Run the selector for the current dependency-ready task; do not use old task counts or chat memory.

Canonical approved sources have been restored and checksum-verified for 130 of 131 Screen IDs. `ADM-54` remains external-only. The current decision and detailed evidence are recorded in `agent_pack/08_reality_sync/PLATFORM_COMPLETION_AUDIT.json` and `docs/audits/PLATFORM_COMPLETION_AUDIT_AR.md`.

Current completion claims remain intentionally false for all APIs tested, all 131 screens complete, production-parity readiness, and the full platform until the expanded graph closes with real evidence.
