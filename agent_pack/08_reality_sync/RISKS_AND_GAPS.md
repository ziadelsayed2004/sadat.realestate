# Risks and Gaps

## Post-release audit risks — 2026-08-22

- Full UI fidelity is unproven. Existing saved snapshots compare current runtime output with earlier runtime output; they do not prove direct parity with all approved design-source exports.
- The official visual command covers only one public-site spec, although the repository has 42 screenshot-bearing Playwright specs and 80 screenshot assertions.
- Public homepage and property-listing visual coverage can pass on an error state because no populated API fixture or required success-state assertion exists in those cases.
- Sampled Public, Authentication, and Admin screens have material design-to-runtime differences. Surface-by-surface remediation is tracked by `frontend_092` through `frontend_095`.
- ADM-54 remains external-only. `frontend_096` must stay Blocked until its exact approved source is available.
- A fresh Playwright matrix could not start because the audit environment had no browser executable and its browser download failed. This is an environment blocker, not a passing result.
- The Web client build emits a JavaScript chunk around 1.50 MB minified and warns above 500 kB. `frontend_097` owns a justified enforced bundle budget and performance remediation.
- Complete live API, infrastructure, provider, container, backup/restore, monitoring, and external security evidence remains unavailable. `backend_139` must stay Blocked until those prerequisites exist.
- The final platform claim is owned by `frontend_098` and remains False until every expanded dependency is Complete with valid evidence.

The release risks below are retained for provenance. Where they conflict with the post-release audit, the 2026-08-22 risks are current truth.

## Current release risks — 2026-08-21

- Release readiness is conditional because the environment has no Docker executable and no configured isolated Preview/UAT MongoDB, private storage/scanner, OTP provider, monitoring, backup/restore drill, or external security assurance.
- The repository does not define `npm run security:check`; that missing script is not represented as a pass. Existing API/browser security tests, artifact assertions, and dependency audit are the available repository-owned evidence.
- The unfiltered Web E2E runner was safely terminated after no observable progress and is not claimed as passed. Targeted critical journeys passed 9/9, and the configured 72 visual and 81 accessibility tests passed.
- `DESIGN-EXCEPTION-ADM-54` remains accepted design debt: the exact direct reference is unavailable, direct comparison was not performed, and owner-approved substitute Admin evidence is the only accepted basis.
- The complete API positive/negative/RBAC/ownership/state/upload/replay/concurrency/journey matrix is not proven, so the final release manifest must keep `allApisTested` false.

The historical pre-release snapshot below is retained for provenance only; its old dependency and frontend task statements are not current evidence.

## Current verification boundary

- The Article runtime repair has deterministic static parity evidence, but the current modified source has not completed the repository's mandatory dependency-backed gate. This environment contains no `node_modules`, and its network-approval boundary rejected `npm ci` before npm could execute.
- `frontend_015` must remain partial until `npm ci` and `npm run quality` pass against this exact source. Targeted Article API, Web, visual, and accessibility gates must also run before its completion evidence is created.
- No current dependency-audit, live MongoDB, full API matrix, browser visual, or accessibility result is claimed. Historical completion evidence remains historical and must not be presented as verification of later modifications.
- Static verification does not replace TypeScript semantic checking or execution tests. See `docs/api/article-runtime-truth-repair.md` for the exact follow-up commands.

## Repository and source provenance

- The supplied repository archive has no `.git/` metadata. Branch, commit history, and exact pre-existing tracked changes cannot be reconstructed from this copy.
- Local approved exports cover 130 of 131 registered Screen IDs. `ADM-54` has a recorded external reference but no dedicated local PNG export; the Project Owner approved `DESIGN-EXCEPTION-ADM-54` as a non-blocking visual-source waiver, with direct comparison explicitly unperformed and substitute Admin design-system evidence required.
- The Figma prototypes and identity Drive folder are recorded as authoritative external references but could not be opened by this execution environment. Future screen work must use the recorded links and checked-in final exports and report any remaining frame-access limitation honestly.
- No approved self-hosted Cairo font files were supplied. The runtime uses the Google Fonts stylesheet with system fallbacks; Production privacy, availability, or CSP requirements may require approved self-hosted binaries later.

## Runtime and Production dependencies

- Article mutations use optimistic document versions and bounded audit snapshots. Live race and index behavior still requires an isolated non-Production MongoDB replica set, deterministic fixtures, and safe cleanup.
- Production deployment still requires the environment-specific prerequisites and acceptance evidence recorded by `backend_138`, including transaction-capable MongoDB, private object storage, malware scanning, secrets, provider credentials, monitoring, backup/restore drills, and approved deployment infrastructure.
- The repository contains deterministic Local/Test adapters and fail-closed higher-environment boundaries. Those boundaries do not prove that Production providers are provisioned.
- No real `.env`, secret, Production record, or fabricated operational metric was read or added.

See `01_product/OPEN_QUESTIONS.md`, `01_product/DECISION_LOG.md`, and the selected atomic task before making any later product decision.
