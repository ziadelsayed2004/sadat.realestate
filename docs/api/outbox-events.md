# Durable outbox and scheduling worker

The `events` module is an internal boundary for work that must not disappear between a domain write and delivery. It stores one durable record in `outbox_events`, keyed by a unique `dedupeKey`; callers can safely replay the same enqueue request. The repository is provider-agnostic and has both MongoDB and deterministic in-memory implementations for local tests.

Supported event domains are `notifications`, `sla`, and `ads`. Event payloads are bounded JSON projections and reject credentials, tokens, signed URLs, private keys, and other secret-shaped fields. Aggregate identifiers and event keys are logical values; they are never used as executable paths or query operators.

## Lifecycle and worker lease

Records move through `pending` → `processing` → `delivered`, or through `retry_wait` before another attempt. A worker claims records with an owner and a short lease. Claims use an atomic MongoDB `findOneAndUpdate`, and an expired lease can be reclaimed by another worker. A worker that no longer owns the lease cannot acknowledge or mutate the event.

Handlers are registered by `domain:eventType` (with optional domain or global fallbacks). A successful handler acknowledges the event. Retryable failures use deterministic exponential backoff with a configured cap. Once `maxAttempts` is reached, or when a permanent failure occurs, the record becomes `dead_letter` with a bounded error code/message for operator inspection. Missing handlers fail closed into the dead-letter state; no event is silently discarded.

The worker is an internal process boundary and has no HTTP endpoint. A deployment may call `createOutboxWorker(...).runOnce()` from its worker process or use the bounded `start()` loop. Notifications, SLA evaluation, and ad scheduling should enqueue events inside the owning write transaction when MongoDB transaction support is available. This task does not invent production notification providers, SLA values, ad state changes, or credentials.

Live MongoDB/replica-set and external provider checks remain deployment prerequisites. Local and unit verification uses the in-memory repository and injected handlers; no destructive live delivery is performed.
