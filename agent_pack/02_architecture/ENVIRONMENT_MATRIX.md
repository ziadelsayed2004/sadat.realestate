# Environment Matrix

| Environment | Database | Storage | Providers | Data |
|---|---|---|---|---|
| local | Local MongoDB replica set | Local adapter | Fake adapters | Synthetic only |
| test | Ephemeral replica set | In-memory or temporary | Deterministic fakes | Fixtures |
| preview/UAT | Isolated replica set | Non-production bucket | Sandbox providers | Synthetic UAT |
| production | Reliable managed or self-managed replica set | Production private/public storage | Approved live providers | Real data |

The architecture baseline targets Node 24 LTS. Do not use Node 26 Current for production without a new compatibility decision. Commit the lockfile and never use `latest` in CI.
