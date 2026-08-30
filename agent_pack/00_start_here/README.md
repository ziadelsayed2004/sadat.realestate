# Start Here

Read these files in order:

1. `LANGUAGE_POLICY.md`
2. `SOURCE_OF_TRUTH.md`
3. `PROJECT_EXECUTION_POLICY.md`
4. `SINGLE_TASK_PROTOCOL.md`
5. `POST_TASK_SYNC_PROTOCOL.md`
6. `../01_product/PROJECT_ANALYSIS.md`
7. `../01_product/PRD.md`
8. `../03_execution/PARALLEL_WAVE_PLAN.json`
9. `../03_execution/EXECUTION_ORDER.md`
10. `../03_execution/TASK_BOARD.md`
11. `../05_prompts/PARALLEL_COORDINATOR.md`
12. `../05_prompts/<active-lane-goal>.md`
13. `../05_prompts/MASTER_SINGLE_TASK_RUNNER.md`

## Active delivery program

The authoritative active-versus-historical boundary is `../03_execution/ACTIVE_DELIVERY_PROGRAM.json`. The selector may select only tasks listed in that registry and must not select historical partial or blocked tasks. The registered delivery scope is Arabic RTL and English LTR; `zh-CN` remains deferred historical/PRD provenance and is not an active execution locale.

The Coordinator bootstrap is mandatory before Wave 1. It owns all shared contracts, API, migrations, artifacts, global UI, and Agent Pack writes. Surface agents must not create nested subagents, branches, or additional worktrees.

Then run the selector. Never choose a step number from memory or a previous conversation.
