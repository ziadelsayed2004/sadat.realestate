# Account states and Provider review

`backend_019` implements two reason-bearing Admin mutations:

- `GET /api/v1/admin/users` requires `admin:users.view` and returns a bounded, paginated list of non-Admin account projections.
- `GET /api/v1/admin/users/:userId` requires `admin:users.view` and returns one non-Admin account projection.
- `GET /api/v1/admin/providers` requires `admin:providers.view` and returns a bounded, paginated list of Provider application projections.
- `GET /api/v1/admin/providers/:providerId` requires `admin:providers.view` and returns one Provider application projection.
- `POST /api/v1/admin/users/:userId/transitions` requires `admin:users.manage`.
- `POST /api/v1/admin/providers/:providerId/review` requires `admin:providers.review`; `providerId` is the Provider application identifier exposed by the onboarding contract.
- `GET /api/v1/admin/account-reports` requires `admin:account-reports.view` and returns bounded account-targeted moderation records. Reporter identity is included only when the same verified Admin also has `admin:account-reports.manage`.
- `POST /api/v1/admin/account-reports/:reportId/resolve` requires `admin:account-reports.manage`, a current report version, and a reason of at least five characters. It resolves or dismisses only reports in `open` or `in_review` state.

All read and mutation routes require a verified Admin bearer session, return `Cache-Control: no-store`, validate strict query/JSON input, and expose only explicit projections. List ordering is deterministic and pagination is bounded. Provider document metadata excludes storage keys and URLs. View Only and unassigned Admin accounts fail closed. A target is returned as not found without leaking unrelated account data. Admin targets and self-transitions are rejected because complete administrator lifecycle and last-Super-Admin safeguards remain owned by `backend_121`.

## State policy

The account route accepts `verify`, `reject`, `needs_information`, `suspend`, or `restrict`, always with a 3–1,000 character administrative reason. It enforces the approved account state machine:

- `pending_review -> needs_information | verified | rejected`;
- `verified -> restricted | suspended`;
- `restricted | suspended -> verified`.

Provider approval, rejection, needs-information, and suspension cannot be bypassed through the generic user route. They use the Provider review route so `users`, `provider_profiles`, and `provider_applications` change atomically:

- `pending_review -> needs_information | approved | rejected`;
- `approved -> suspended`;
- `suspended -> approved`.

For Provider review, `verify` maps application/profile `approved` to account `verified`. This means manual platform administrative approval only. It is not government, ownership, registry, OCR, legal, bank, or any automatic verification. A generic Provider `restrict` changes only the account from `verified` to `restricted`; restoring that restriction uses `verify` and does not alter the already-approved application.

Undefined jumps, aggregate-state mismatches, stale concurrent writes, duplicate replays, and cross-route Provider-review bypasses return conflict without a partial write. Every successful mutation uses optimistic state/version predicates inside one MongoDB transaction, appends both the domain-specific immutable account-state transition and the unified redacted audit record with actor, reason, before/after states, request ID, and trace ID, and revokes all active refresh sessions for the target. Audit persistence failure aborts the sensitive mutation.

Account reports are a moderation read/resolve boundary. Their projection contains only the account target, optional role type, bounded reason/details, report status, related-report count, optional authorized reporter identity, resolution reason, version, and timestamps. It does not expose internal notes, assignments, audit records, storage keys, or private documents. Report resolution uses the same optimistic version and mandatory-reason policy as property reports; account restrictions remain owned by the generic account transition route above.

## Immediate session enforcement

Before protected product routers accept a bearer token, the installed accounts runtime confirms that its session remains active and that the token role/status still matches the persisted account. A transition therefore invalidates already-issued bearer sessions immediately rather than waiting for the 15-minute access-token expiry. New authentication remains governed by the authentication account-state policy.

## Deliberate boundary

Q-012 remains pending for account deletion, data retention, and privacy requests. These routes do not delete, soft-delete, anonymize, retain, or imply a privacy-request workflow. No live mutation was run because an isolated non-production MongoDB replica set and synthetic accounts were not configured; deterministic contract, service, authorization, replay, concurrency, and ephemeral HTTP tests cover this task.
