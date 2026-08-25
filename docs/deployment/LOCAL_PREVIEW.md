# Native Local full-platform preview

## Prerequisites

- Windows 10/11, Ubuntu, or macOS
- Node.js 24.x
- npm 11
- Free ports: 8080, 8025, 1025, 3000, and 4173
- A reachable non-production MongoDB service or isolated Atlas URI in `MONGODB_URI`

The native supervisor does not install or start privileged services. It never downloads MongoDB, manages Docker, or embeds a database process.

## First start

From Command Prompt or PowerShell:

```bat
npm ci
npm run local:prepare
npm run local:check
npm run local:up
npm run local:smoke
```

`local:up` verifies the configured MongoDB target, builds the workspaces, starts the SMTP catcher, API, Web SSR, and local reverse proxy, then applies the synthetic seed automatically.

Open:

- Platform: `http://localhost:8080`
- OTP inbox: `http://localhost:8025`


## Dummy accounts and data

The synthetic Provider identity is:

- Phone: `+201000000001`
- Email: `provider.demo@example.invalid`

The Local-only Super Admin (when explicitly bootstrapped on a replica-set/Atlas target) is:

- Email: `admin.demo@example.invalid`
- Password: `LocalPreview-Admin-Only-2026!`

These Admin credentials are intentionally fixed only for the isolated Local preview. They are not written to the Production example and must never be copied to a VPS.

Request a Provider OTP from the application and read the email at `http://localhost:8025`. For Seeker registration, use a unique E.164 phone and an `.invalid` email; the local inbox captures it without sending anything to the internet.

The `local-showcase-v1` and `local-showcase-v2` seeds are Local/UAT-only, idempotent, and mark records `synthetic: true`. They cover locations, projects/properties, public content, articles, community content, requests, viewings, saved properties, notifications, advertising quote/payment metadata, administrator permission variants, and commission records. Payment proofs contain private storage metadata only, never public file URLs. Standalone MongoDB runs with bootstrap disabled; use an isolated replica set or Atlas only when transactional bootstrap is intentionally enabled. No Production sessions, secrets, or fake Production KPIs are created.

Reapply it with:

```bat
npm run local:seed
```

## Operations

```bat
npm run local:status
npm run local:logs
npm run local:smoke
npm run local:down
```

If startup fails:

1. Run `npm run local:logs`.
2. Confirm the five application ports are free and that `MONGODB_URI` reaches the intended non-production database.
3. If `.env.local` is from an older release, delete only `.env.local`, then run `npm run local:prepare`.
4. Do not change a MongoDB service or privileged Windows service automatically; repair the supplied URI or service configuration explicitly.

The preview data is disposable. `local:down` stops only repository-owned child processes. Removing `.local/` clears runtime state and captured email; MongoDB data remains governed by the external URI.

## Evidence boundary

This preview proves source build, native process startup, real replica-set semantics, synthetic projections, local email OTP, private Local storage, and health/readiness. It does not prove Hostinger SMTP authentication, public DNS/TLS, native ClamAV signature freshness, VPS resource capacity, off-server backup, restore, or rollback.
