# Environment Matrix

| Environment | Database | Storage | Malware scanner | Other providers | Data |
|---|---|---|---|---|---|
| local | Local MongoDB replica set | Isolated filesystem adapter outside every public/static root | Deterministic clean/infected/timeout/failure fake | Fake adapters | Synthetic only |
| test | Ephemeral replica set | Isolated temporary or in-memory adapter | Deterministic fixtures for every scanner outcome | Deterministic fakes | Fixtures |
| preview/UAT | Isolated replica set | Isolated private S3-compatible non-production namespace with encryption | Configured sandbox ClamAV-compatible or equivalent approved scanner | Sandbox providers | Synthetic UAT |
| production | Reliable managed or self-managed replica set | Private S3-compatible storage with encryption, least privilege, lifecycle rules, and separate public/private namespaces | Configured approved scanner; unavailable configuration fails readiness and upload capability closed | Approved live providers | Real data |

The commercial storage/scanner vendor, endpoint, region, bucket names, and credentials are deployment configuration and Production Readiness prerequisites. They do not block adapter implementation. Preview/UAT/Production never fall back to Local storage or bypass scanning when configuration is absent.

The architecture baseline targets Node 24 LTS. Do not use Node 26 Current for production without a new compatibility decision. Commit the lockfile and never use `latest` in CI.
