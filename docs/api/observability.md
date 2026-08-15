# API observability baseline

The API emits one newline-delimited JSON record when each HTTP request completes. Records contain only an event name, level, UTC timestamp, request/trace identifiers, method, matched route pattern, status, and elapsed milliseconds. Request bodies, raw paths, query values, headers, cookies, client addresses, and user agents are not logged.

## Correlation context

- A valid `X-Request-Id` is retained; malformed or missing values are replaced with a generated UUID.
- A valid W3C `traceparent` contributes its trace ID and flags. Malformed or all-zero values are discarded and replaced.
- Every response includes canonical `X-Request-Id` and `Traceparent` headers.
- Request context is stored with `AsyncLocalStorage`, so later services can obtain correlation IDs without global mutable state.
- `/health` and `/ready` keep their existing response bodies and readiness semantics.

## Redaction policy

Structured metadata is sanitized recursively before serialization. Credential, cookie, password, secret, token, session, contact, personal-name, address/IP, government-ID, birth-date, bank/card, MongoDB URI, database URL, and connection-string keys are replaced with `[REDACTED]`. Free-form strings additionally redact bearer tokens, JWT-like values, URL credentials, email addresses, and Egyptian mobile numbers. Error objects expose only their class name; messages and stacks are never serialized.

Fields are depth-, count-, and length-bounded. Cycles and unsupported values receive safe markers. A logging sink failure is swallowed so it cannot change an API response.

## Extension rules

Later tasks should use fixed event names and structured, allowlisted metadata. They must not log complete domain objects or inbound headers/bodies. Sensitive audit records belong in the append-only audit module; operational logs may carry only its trace/request identifiers. Multi-process aggregation and exporter/provider selection remain deployment concerns and must preserve this redaction boundary.

## Metrics and error-reporting hooks

The observability middleware accepts an optional bounded in-memory `MetricsRegistry` and an optional `ErrorReporter`. It records only method, route pattern, status, abort state, and elapsed duration. Metric series are capped, labels are sorted deterministically, and sensitive label names or values are rejected. Histograms retain the latest bounded observation; no percentile, throughput, or business KPI is inferred.

Server responses in the 5xx range may invoke the error-reporting hook with only an error class name, route pattern, status code, request ID, trace ID, and timestamp. Messages, stacks, headers, bodies, credentials, contact data, and raw URLs never cross this boundary. A reporter or metrics sink failure is swallowed so observability cannot change an API response.

## Alert signals and runbook

The checked-in alert catalog contains three provider-neutral signals: `readiness_not_ready` (critical, `readiness-failure`), `http_server_error` (critical, `api-server-error`), and `dependency_degraded` (warning, `dependency-degraded`). Signals produce a safe runbook key and correlation identifiers only; they do not claim a vendor, threshold, SLA, or production incident. Deployment monitoring must choose thresholds and exporters from approved operational configuration.

Runbook actions are intentionally provider-neutral:

1. For readiness failures, inspect `/ready`'s redacted dependency states, restore the required dependency, and verify a healthy probe before routing traffic.
2. For server errors, correlate by request/trace ID, inspect sanitized logs, reproduce with synthetic data, and roll back or disable the failing release if the error persists.
3. For dependency degradation, check the adapter's fail-closed readiness state and provider status, then recover or replace the adapter without exposing credentials.

No alert payload contains a user identifier, email, phone, address, IP, token, secret, request body, or raw provider response.
