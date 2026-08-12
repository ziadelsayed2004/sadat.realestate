# Open Questions & Decision Register

Entries marked Pending remain unresolved. Their defaults are temporary planning assumptions only and are not approved product behavior. Entries marked Resolved contain approved product decisions.

| ID | Decision required | Owner role | Status | Affected work | Temporary default / constraint |
|---|---|---|---|---|---|
| Q-001 | Login identifier, OTP channel, and provider authentication model | Product + Security | Resolved | `backend_011`, `backend_012`, `backend_016`, `frontend_020` | Seekers and Property Providers use normalized E.164 phone numbers with OTP and no passwords. Admin users use normalized email addresses and passwords. OTP uses an adapter boundary with deterministic fake adapters in Local and Test; the Production vendor is a readiness prerequisite and does not block implementation. Admin-only passwords follow `SECURITY_BASELINE.md`. All successful authentication uses the same access-token and rotating opaque-refresh session model. Admin MFA remains a separate pre-production decision/task unless otherwise required by repository truth. |
| Q-002 | Required fields and documents for each provider type | Product + Compliance | Pending | `backend_014`, `backend_015`, `frontend_022`–`frontend_025` | Derive from approved frames; do not guess |
| Q-003 | Storage/CDN provider, file limits, and retention | Platform + Security | Pending | `backend_015`, `backend_047`, `backend_103`, `backend_124`, `backend_130` | Storage adapter; local-only adapter for development |
| Q-004 | Map/geocoding provider and location precision | Product + Platform | Pending | `backend_044`, `backend_055`, `frontend_042` | Coordinates optional until approved |
| Q-005 | Notification channels and delivery policy | Product + Platform | Pending | `backend_068`, `backend_081`, `backend_122`, `backend_125` | In-app required; other channels are adapters |
| Q-006 | Advertising currency, tax treatment, and quote expiry | Finance + Product | Pending | `backend_100`–`backend_108`, `frontend_049`, `frontend_070` | EGP; no assumed tax; expiry requires approval |
| Q-007 | Commission event, settlement, and collection method | Finance + Product | Pending | `backend_110`–`backend_117`, `frontend_049`, `frontend_071` | No financial execution until approved |
| Q-008 | SLA by request type and assignment rules | Operations + Product | Pending | `backend_070`, `backend_077`–`backend_080`, `frontend_066` | Settings only; no production values inferred |
| Q-009 | Privacy policy for contact and communication data | Legal + Product | Pending | `backend_062`, `backend_069`, `backend_071`, `backend_080` | Communication through requests until approved |
| Q-010 | Hosting domains and MongoDB topology | Platform + Operations | Pending | `backend_004`, `backend_125`, `backend_132`–`backend_138`, `frontend_087` | Node 24 LTS plan; Mongo replica set required for transactional paths |
| Q-011 | Import/export and analytics scope | Product + Operations | Pending | `backend_120`, `backend_128`, `backend_131` | Outside current scope unless approved |
| Q-012 | Account deletion, retention, and privacy-request policy | Legal + Security | Pending | `backend_019`, `backend_123`, `frontend_035`, `frontend_074` | Soft delete and retention remain pending legal decision |

Each decision must record owner, date, decision, rationale, alternatives, and affected tasks. An unresolved decision blocks only the dependent scope; it must not be bypassed by inventing behavior.
