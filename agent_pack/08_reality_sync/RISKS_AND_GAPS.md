# Risks and Gaps

## Deployment preparation risks — 2026-08-24

- All manifest-referenced design-source files now exist and the source-integrity audit passes. This does not authorize full visual parity: PUB-01 and 129 other historical owning frames still require current direct-Figma revalidation, ADM-18 has no independent historical owning frame, and ADM-54 is covered by an owner-approved structured comparison without a historical parity claim.
- Hostinger SMTP parsing, adapter behavior, readiness failure, TLS configuration, and message projection are tested, but real authentication and delivery from `info@elsadatrealestate.com` were not run because no mailbox password was supplied. SPF, DKIM, DMARC, PTR/reputation, spam placement, throttling, and outbound VPS port access require live verification.
- Native runtime migration replaced the previous orchestration path. Local supervisor startup, MongoDB replica-set behavior, ClamAV readiness, filesystem permissions, Nginx/Certbot, systemd restart behavior, backup, restore, and rollback require fresh evidence and remain `backend_139` gaps until run.
- The current single-VPS candidate uses a private local filesystem directory. Q-003 still states that Preview/UAT/Production require approved S3-compatible private storage. This candidate is suitable for Local/pre-deployment evaluation only until the Project Owner and Security approve the durable single-VPS storage/backup boundary or an S3-compatible adapter is implemented and verified.
- The 513 passing API tests are deterministic repository-owned evidence. They do not authorize an “all APIs tested” claim because the 178-route live positive/negative/RBAC/IDOR/state/upload/replay/concurrency matrix has not run against isolated production-parity providers.
- The repository contains no real `.env`, SMTP password, Production data, or bootstrap credential. Production startup must remain blocked until secrets are generated on the VPS, the Hostinger mailbox password is inserted there, the first Super Admin is bootstrapped once, and the release checklist passes.

## Post-release audit risks — 2026-08-22

- Full UI fidelity is unproven. Existing saved snapshots compare current runtime output with earlier runtime output; they do not prove direct parity with all approved design-source exports.
- The official visual command covers only one public-site spec, although the repository has 42 screenshot-bearing Playwright specs and 80 screenshot assertions.
- Public homepage and property-listing visual coverage can pass on an error state because no populated API fixture or required success-state assertion exists in those cases.
- Sampled Public, Authentication, and Admin screens have material design-to-runtime differences. Surface-by-surface remediation is tracked by `frontend_092` through `frontend_095`.
- ADM-54 has no recovered historical export. The owner-authored local source and structured runtime comparison are approved under `DESIGN-DECISION-ADM-54-AUTHOR-001`; the historical direct-comparison waiver remains active.
- A fresh Playwright matrix could not start because the audit environment had no browser executable and its browser download failed. This is an environment blocker, not a passing result.
- The Web client build emits a JavaScript chunk around 1.50 MB minified and warns above 500 kB. `frontend_097` owns a justified enforced bundle budget and performance remediation.
- Complete live API, infrastructure, provider, backup/restore, monitoring, and external security evidence remains unavailable. `backend_139` must stay Blocked until those prerequisites exist.
- The final platform claim is owned by `frontend_098` and remains False until every expanded dependency is Complete with valid evidence.

The release risks below are retained for provenance. Where they conflict with the post-release audit, the 2026-08-22 risks are current truth.

## Current release risks — 2026-08-21

- Release readiness is conditional because no configured isolated Preview/UAT MongoDB, native Nginx/systemd host, private storage/scanner, OTP provider, monitoring, backup/restore drill, or external security assurance has current live evidence.
- The repository does not define `npm run security:check`; that missing script is not represented as a pass. Existing API/browser security tests, artifact assertions, and dependency audit are the available repository-owned evidence.
- The unfiltered Web E2E runner was safely terminated after no observable progress and is not claimed as passed. Targeted critical journeys passed 9/9, and the configured 72 visual and 81 accessibility tests passed.
- `DESIGN-EXCEPTION-ADM-54` remains the historical-source waiver: the exact direct reference is unavailable and direct historical comparison was not performed. The newer `DESIGN-DECISION-ADM-54-AUTHOR-001` source is pending explicit owner review.
- The complete API positive/negative/RBAC/ownership/state/upload/replay/concurrency/journey matrix is not proven, so the final release manifest must keep `allApisTested` false.

The historical pre-release snapshot below is retained for provenance only; its old dependency and frontend task statements are not current evidence.

## Current verification boundary

- The Article runtime repair has deterministic static parity evidence, but the current modified source has not completed the repository's mandatory dependency-backed gate. This environment contains no `node_modules`, and its network-approval boundary rejected `npm ci` before npm could execute.
- `frontend_015` must remain partial until `npm ci` and `npm run quality` pass against this exact source. Targeted Article API, Web, visual, and accessibility gates must also run before its completion evidence is created.
- No current dependency-audit, live MongoDB, full API matrix, browser visual, or accessibility result is claimed. Historical completion evidence remains historical and must not be presented as verification of later modifications.
- Static verification does not replace TypeScript semantic checking or execution tests. See `docs/api/article-runtime-truth-repair.md` for the exact follow-up commands.

## Repository and source provenance

- The supplied repository archive has no `.git/` metadata. Branch, commit history, and exact pre-existing tracked changes cannot be reconstructed from this copy.
- Local approved exports cover 130 of 131 registered Screen IDs. ADM-54 retains its recorded external reference and now has an owner-authored HTML/PNG review source; the source is not historical Figma evidence, direct historical comparison remains unperformed, and explicit owner review is required before `frontend_096` can close.
- The Figma prototypes and identity Drive folder are recorded as authoritative external references but could not be opened by this execution environment. Future screen work must use the recorded links and checked-in final exports and report any remaining frame-access limitation honestly.
- No approved self-hosted Cairo font files were supplied. The runtime uses the Google Fonts stylesheet with system fallbacks; Production privacy, availability, or CSP requirements may require approved self-hosted binaries later.

## Runtime and Production dependencies

- Article mutations use optimistic document versions and bounded audit snapshots. Live race and index behavior still requires an isolated non-Production MongoDB replica set, deterministic fixtures, and safe cleanup.
- Production deployment still requires the environment-specific prerequisites and acceptance evidence recorded by `backend_138`, including transaction-capable MongoDB, private object storage, malware scanning, secrets, provider credentials, monitoring, backup/restore drills, and approved deployment infrastructure.
- The repository contains deterministic Local/Test adapters and fail-closed higher-environment boundaries. Those boundaries do not prove that Production providers are provisioned.
- No real `.env`, secret, Production record, or fabricated operational metric was read or added.

See `01_product/OPEN_QUESTIONS.md`, `01_product/DECISION_LOG.md`, and the selected atomic task before making any later product decision.
