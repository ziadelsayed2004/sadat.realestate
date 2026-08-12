# Post-Task Sync Protocol

After each selected task:

1. Write `07_finish/<task_id>/completion.json` with a summary, changed files, verification, source evidence, and known gaps.
2. For successful completion, run:

```bash
node agent_pack/scripts/set_task_status.mjs <task_id> complete
node agent_pack/scripts/sync_pack.mjs
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

3. Confirm that `TASK_BOARD.md`, `COUNT_SUMMARY.json`, `FINISH_INDEX.json`, and `step_info.json` agree.
4. Do not edit generated state views manually. Use the status tool for state transitions.
5. If the task is Partial or Blocked, set that status with an exact reason, run sync/audit/selector, report the blocker, and stop.
