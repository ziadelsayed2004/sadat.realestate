# Sadat Real Estate — Agent Pack

This execution pack converts the approved developer handoff into a dependency-aware, evidence-based delivery graph for a MERN application using TypeScript and Vite. It preserves repository truth and now uses a Coordinator-owned bootstrap followed by controlled parallel surface lanes.

See `CHANGELOG.md` for the current pack revision.

## Snapshot

| Item | Value |
|---|---:|
| Reference screens and states | 131 |
| Backend tasks | 124 |
| Frontend tasks | 90 |
| Total tasks | 214 |
| API route blueprints | 187 (178 implemented, 9 planned) |
| Runtime progress | Read `03_execution/TASK_STATE.json` and `step_info.json` |

## Language Boundary

- The Agent Pack, task contracts, prompts, generated reports, and templates are English-only.
- The product's primary visual locale is Arabic with RTL direction. English and Simplified Chinese remain supported where the product requirements require them.
- English-only planning does not authorize replacing, removing, or weakening Arabic product UI, Arabic CMS content, localization, or RTL acceptance criteria.

The active pre-commit coordinator is `frontend_105`. Its approved execution scope is Arabic RTL and English LTR; `zh-CN` is excluded from execution and editing for this audit.

## Start Here

1. Read `00_start_here/README.md`.
2. From the repository root, run:

```bash
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

3. Read `step_info.json` and the selected atomic task.
4. For the current surface delivery, read `05_prompts/PARALLEL_COORDINATOR.md` and the selected lane goal.
5. Use `05_prompts/MASTER_SINGLE_TASK_RUNNER.md` for atomic task execution when the Coordinator assigns a task.
6. Execute only the assigned lane, verify it, write evidence, synchronize the pack, and stop.

## Governing Rules

- Runtime code and executable tests outrank chat memory and stale checkboxes.
- The active 131-screen delivery baseline is Public 12, Auth 19, Seeker 10, Provider 24, and Admin 66. Supplementary is historical Auth evidence, not a surface or screen count.
- The Coordinator must complete the shared email-only Auth and `mapUrl` bootstrap before Wave 1 starts. Shared-contract, API, router, global-style, pack, and ledger changes go through the Coordinator queue.
- The Bootstrap quality gate is currently green; Wave 1 may open the Public, Auth, and Seeker goals in parallel. This does not close any screen and does not authorize Provider/Admin to start early.
- Wave 1 runs Public, Auth, and Seeker in parallel on separate roots. Wave 2 runs Provider after Wave 1 reconciliation. Wave 3 runs Admin alone after Wave 2.
- Each Screen ID is owned by exactly one frontend task.
- Production mocks are forbidden, and no task closes without evidence.
- Figma and the linked Drive frames define visual truth; this pack defines execution, contracts, dependencies, and coverage.
