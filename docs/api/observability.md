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
