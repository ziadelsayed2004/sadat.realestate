# Backend end-to-end journeys

`apps/api/src/modules/testing/journeys.ts` defines the deterministic `backend-journeys-v1` harness used by `tests/testing/journeys.test.ts`.

The journey matrix covers:

- registration and provider/project/property publication;
- seeker/provider/admin request ownership and state transitions;
- advertising quote and payment-proof boundaries;
- commission policy resolution, approved-event snapshots, and the read-only provider projection;
- cleanup of synthetic request, advertising, and session state.

Route steps are checked against the runtime route inventory before execution. Ads and commissions are currently service-level boundaries, so the matrix names those operations without inventing HTTP routes. The test uses synthetic IDs, an in-memory storage adapter, a deterministic malware scanner, and a fixed clock. It never reads credentials, writes production data, or claims a live MongoDB/provider execution.

The runner executes one step at a time and always attempts cleanup in a `finally` boundary. A failed mandatory step remains a failed journey; cleanup success does not hide that failure. Live MongoDB, external storage/scanning, payment providers, and production accounts remain optional checks for an isolated non-production environment.

