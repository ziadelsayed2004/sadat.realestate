# Sensitive-action audit log

`backend_020` provides one append-only audit boundary for sensitive administrative and private-document actions. Records contain the actor, target, stable action key, mandatory reason, bounded before/after snapshots, request ID, trace ID, and occurrence time. The model rejects every update, replacement, and delete operation; application code can append only.

## Active HTTP routes

- `GET /api/v1/admin/audit-logs` lists records with page/limit and allowlisted actor, target, action, trace, and date filters.
- `GET /api/v1/admin/audit-logs/:auditId` returns one record by its validated identifier.

Both routes require a verified Admin bearer session and the explicit `admin:audit.view` capability, return `Cache-Control: no-store`, and use explicit response projections. Public, Seeker, Provider, suspended Admin, unassigned Admin, and insufficient-capability callers fail closed. A missing detail is returned as not found without leaking other administrative data.

## Transaction and redaction policy

The current writers cover reason-bearing account transitions, Provider review decisions, RBAC role creation/update/assignment, and successful private-provider-document access grants. Sensitive database mutations and their audit records share the same MongoDB transaction; an audit write failure aborts the mutation. Private access grants are not issued when their audit write fails.

Snapshots are redacted before persistence and redacted again before read delivery. Secret-shaped keys, credentials, passwords, tokens, bearer values, signed URLs, private storage keys, email addresses, and phone numbers are replaced with non-sensitive markers. Values, arrays, nesting depth, object keys, and field counts are bounded. Circular and unsupported values cannot leak through the audit boundary.

## Verification boundary

Deterministic contract, model, redaction, writer, service, authorization, router, and transaction-integration tests verify the implementation. No live database mutation is claimed because this run has no explicitly isolated non-production MongoDB replica set or synthetic administrative identities. Future sensitive modules must use this writer rather than inventing independent mutable audit stores.
