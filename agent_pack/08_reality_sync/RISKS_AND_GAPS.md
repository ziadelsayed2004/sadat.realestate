# Risks and Gaps

## Repository and source provenance

- The supplied repository archive has no `.git/` metadata. Branch, commit history, and exact pre-existing tracked changes cannot be reconstructed from this copy.
- Local approved exports cover 130 of 131 registered Screen IDs. `ADM-54` has a recorded external reference but no dedicated local PNG export.
- The Figma prototypes and identity Drive folder were supplied as authoritative external references but could not be opened by this execution environment. Future screen work must use the recorded links and the checked-in final exports, and must report any remaining frame-access limitation honestly.
- No approved self-hosted Cairo font files were supplied. The runtime currently uses the Google Fonts stylesheet with system fallbacks; a Production privacy, availability, or CSP policy may require approved self-hosted binaries later.

## Verification and execution environment

- Browser visual, Playwright, and accessibility regression gates are not yet repository-native and remain assigned to `frontend_009`. Foundation unit, SSR, asset-integrity, build, locale, and direction checks pass, but this is not a pixel-perfect screen claim.
- A local production-server smoke attempt was blocked by the execution sandbox before a stable browser connection could be established. The deterministic client build, SSR tests, and Web unit tests passed.
- `npm ci` and `npm audit` were blocked before execution by the sandbox network-approval boundary. The existing lockfile and installed repository-local toolchain were used for all deterministic checks. No dependency-audit result is claimed for this update.
- Live MongoDB and full external-provider journeys were not rerun for this Frontend task. They require an isolated non-Production replica set, safe seed data, credentials, and cleanup capability.

## Production readiness dependencies

- Production deployment still requires the environment-specific prerequisites and acceptance evidence recorded by `backend_138`, including a transaction-capable MongoDB topology, private object storage, malware scanning, secrets, provider credentials, monitoring, backup/restore drills, and approved deployment infrastructure.
- The repository contains deterministic Local/Test adapters and fail-closed higher-environment boundaries. Those boundaries do not prove that Production providers are provisioned.
- No real `.env`, secret, Production record, or fabricated operational metric was read or added.

See `01_product/OPEN_QUESTIONS.md`, `01_product/DECISION_LOG.md`, and the selected atomic task before making any later product decision.
