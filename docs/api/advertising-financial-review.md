# Advertising financial review and ledger

Financial review is an administrator-only, filterable projection over authoritative advertising request, quote, payment-proof, and schedule records. It reports quote totals as quoted amounts and payment proofs as review/security states. An uploaded or approved proof is not bank verification, and a quote or scheduled placement is not realized revenue.

Ledger entries identify their source (`quote`, `payment_proof`, or `schedule`) and carry `accountingTreatment: not_realized`. Quote decision events may include the quoted minor-unit amount and currency; payment-proof and schedule events never invent an amount. Storage keys, download URLs, credentials, and unsupported bank/revenue fields are excluded. Filters, date ranges, and pagination are strict and bounded, with deterministic newest-first ordering.

The implementation is a source-adapter boundary because the current runtime has separate in-memory advertising and payment services and no persistent financial repository. HTTP route composition and persistence remain integration work when that boundary is available.
