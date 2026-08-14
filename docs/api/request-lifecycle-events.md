# Request Lifecycle Events and Notifications

Request lifecycle events use an append-only outbox boundary with stable deduplication keys. Enqueue replay returns the original event, pending reads are bounded and deterministic, and delivery acknowledgment is idempotent. The adapter does not claim an external provider or duplicate-free delivery beyond the local outbox contract.
