# frontend_098 — Final Production-Parity Platform Gate

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | final release |
| Kind | release |
| Sequence | 198 / 199 |
| Depends on | `backend_139`, `frontend_096`, `frontend_097` |

## Goal

Re-run every repository-owned and external readiness gate and issue the final platform decision without unsupported completeness claims.

## Screen IDs

- Final cross-platform gate; no single-screen ownership.

## Source References

- `08_reality_sync/PLATFORM_COMPLETION_AUDIT.json`
- `08_reality_sync/FINAL_RELEASE_MANIFEST.json`
- `09_sources/DESIGN_SOURCE_MANIFEST.json`

## Allowed Roots

- `apps/api/**`
- `apps/web/**`
- `packages/**`
- `docs/**`
- `agent_pack/**`

## Acceptance Criteria

- [ ] All prior remediation and assurance tasks are complete with valid evidence.
- [ ] Agent Pack audit, selector, manifests, counts, finish index, and truth docs are synchronized.
- [ ] Every implemented API has the required matrix evidence or the all-APIs claim remains false.
- [ ] Every canonical screen has direct approved-source evidence or the all-screens claim remains false.
- [ ] Production-parity infrastructure, providers, backup/restore, monitoring, native services, and security assurance are proven.
- [ ] Full platform completion is claimed only when the entire expanded graph is complete and all mandatory gates pass.

## Verification

- all root and workspace typecheck, lint, test, build, audit, inventory, contract, browser, visual, accessibility, performance, security, live-provider, and infrastructure gates
- `node agent_pack/scripts/audit_pack.mjs`
- `node agent_pack/scripts/select_next_step.mjs`
