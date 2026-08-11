# Deployment & Operations Plan

## Processes

- API process.
- Worker process للoutbox/schedules/SLA.
- Web SSR process + static assets.
- MongoDB replica set.
- Object storage/CDN حسب القرار.

## Release

build immutable images → migrations/index checks → deploy preview → smoke → backup checkpoint → rolling production → post-deploy smoke → monitor → rollback عند الفشل.

## Required Gates

typecheck، lint، tests، audit، OpenAPI diff، pack audit، database readiness، storage/provider readiness، backup restore evidence، health/readiness، no secrets scan.

## Official Technical Basis

- [Node.js releases](https://nodejs.org/en/about/previous-releases)
- [Express 5 migration](https://expressjs.com/en/guide/migrating-5/)
- [Vite SSR guide](https://vite.dev/guide/ssr)
- [MongoDB transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- [MongoDB indexes](https://www.mongodb.com/docs/manual/indexes/)
