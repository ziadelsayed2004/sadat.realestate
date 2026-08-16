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

Backend task state is complete through the backend readiness gate. Frontend work remains controlled by the selector; completion of foundation tasks does not claim completion of the 131 mapped product screens.
