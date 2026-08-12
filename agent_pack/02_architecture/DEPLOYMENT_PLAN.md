# Deployment and Operations Plan

## Processes

- API process.
- Worker process for outbox, schedules, and SLA.
- Web SSR process plus static assets.
- MongoDB replica set.
- Object storage and CDN according to the approved decision.

## Release Flow

Build immutable images -> run migration and index checks -> deploy preview -> smoke test -> create backup checkpoint -> rolling production deployment -> post-deploy smoke -> monitor -> roll back on failure.

## Required Gates

Typecheck, lint, tests, dependency audit, OpenAPI diff, Agent Pack audit, database readiness, storage/provider readiness, backup-restore evidence, health/readiness, and secret scanning.

## Official Technical Basis

- [Node.js releases](https://nodejs.org/en/about/previous-releases)
- [Express 5 migration](https://expressjs.com/en/guide/migrating-5/)
- [Vite SSR guide](https://vite.dev/guide/ssr)
- [MongoDB transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- [MongoDB indexes](https://www.mongodb.com/docs/manual/indexes/)
