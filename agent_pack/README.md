# Sadat Real Estate — Agent Pack

This execution pack converts the approved developer handoff into a dependency-aware, evidence-based delivery graph for a MERN application using TypeScript and Vite. It preserves repository truth and executes backend work before frontend work.

See `CHANGELOG.md` for the current pack revision.

## Snapshot

| Item | Value |
|---|---:|
| Reference screens and states | 131 |
| Backend tasks | 113 |
| Frontend tasks | 75 |
| Total tasks | 188 |
| Planned API route blueprints | 160 |
| Runtime progress | Read `03_execution/TASK_STATE.json` and `step_info.json` |

## Language Boundary

- The Agent Pack, task contracts, prompts, generated reports, and templates are English-only.
- The product's primary visual locale is Arabic with RTL direction. English and Simplified Chinese remain supported where the product requirements require them.
- English-only planning does not authorize replacing, removing, or weakening Arabic product UI, Arabic CMS content, localization, or RTL acceptance criteria.

## Start Here

1. Read `00_start_here/README.md`.
2. From the repository root, run:

```bash
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

3. Read `step_info.json` and the selected atomic task.
4. Use `05_prompts/MASTER_SINGLE_TASK_RUNNER.md` in Code/Agent execution mode.
5. Execute exactly one task, verify it, write evidence, synchronize the pack, and stop.

## Governing Rules

- Runtime code and executable tests outrank chat memory and stale checkboxes.
- Frontend work cannot start until `backend_138` is complete and v1 contracts are frozen.
- Each Screen ID is owned by exactly one frontend task.
- Production mocks are forbidden, and no task closes without evidence.
- Figma and the linked Drive frames define visual truth; this pack defines execution, contracts, dependencies, and coverage.
