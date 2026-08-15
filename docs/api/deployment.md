# Container and runtime deployment

The checked-in [`Dockerfile`](../../Dockerfile) uses separate dependency, build, and runtime stages on the repository's Node 24 baseline. The runtime image runs as the non-root `node` user, exposes port `3000`, starts only the built API entrypoint, and has a liveness health check against `/health`. The API's `/ready` endpoint remains the dependency-aware probe for orchestration and deployment gates.

`apps/api/src/modules/deployment/runtime.ts` is the runtime lifecycle boundary. It publishes the health/readiness paths and a 10-second shutdown grace period, and its coordinator stops the HTTP server before disconnecting MongoDB. Shutdown is idempotent; dependency errors and timeouts set a failure exit code without serializing private error details.

## Local Compose

[`docker-compose.yml`](../../docker-compose.yml) is development-only. It starts the API, a MongoDB replica-set process, and a one-shot replica-set initializer. The API waits for initialization, uses the `local` environment, and receives `AUTH_ACCESS_TOKEN_SECRET` only from the caller's environment; no secret or production data is checked in. The named Mongo volume is local development state and must not be reused as a production backup.

Run `docker compose config` and `docker compose up --build` only with a local-only base64url secret supplied out of band. Docker-engine execution is not claimed by repository tests in environments without Docker. Before preview/UAT/production, pin approved image digests, provide the managed MongoDB replica set and private providers, run migrations/index checks and a verified isolated backup/restore drill, and configure resource, network, secret, and rolling-deployment policies outside this repository.

The Compose health check is intentionally stricter than the image liveness check: it calls `/ready`, so the API remains unhealthy until MongoDB and all installed required adapters are ready. No HTTP route or public container metadata is added by this task.
