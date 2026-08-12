# Single-Task Protocol

1. Work from the repository root. Inspect `git status` and preserve user-owned changes.
2. Confirm that the runner is in Code/Agent execution mode. Planning-only mode is not allowed for task execution.
3. Run `node agent_pack/scripts/audit_pack.mjs` and `node agent_pack/scripts/select_next_step.mjs`.
4. Read `step_info.json`, the selected atomic task, and only its referenced product, architecture, and runtime contracts.
5. Inspect actual runtime code before changing files; never rely on expected names alone.
6. Timebox discovery to five minutes unless a concrete repository blocker is being investigated.
7. Mark the selected task In Progress using the status tool.
8. Implement the smallest coherent change that satisfies every applicable acceptance criterion.
9. Add relevant positive, negative, authorization, validation, transition, replay, and concurrency tests.
10. Run targeted verification and all still-applicable repository gates.
11. Write `07_finish/<task_id>/completion.json` from the template.
12. Mark the task Complete only if all required acceptance criteria and verification gates pass.
13. Run sync, audit, and selector; report the next selected task, then stop.

If completion is impossible, mark the task Partial or Blocked with an exact reason, synchronize the pack, and stop. Never force a Complete status.

Forbidden actions include reading a real `.env`, printing secrets, touching production data, skipping dependencies, silently changing product truth, querying package registries for planning, or waiting indefinitely on network commands.
