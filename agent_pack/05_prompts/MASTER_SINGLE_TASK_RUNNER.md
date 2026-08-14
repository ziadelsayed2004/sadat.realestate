# Sadat Real Estate — Single-Task Codex Runner

Use the current repository and `agent_pack/` as the only authoritative execution graph. Discover current state from the repository; do not rely on fixed step names, old progress counts, or previous chat memory.

## Execution-Mode Guard

- This prompt must run in Code/Agent execution mode, not planning-only mode.
- If the environment is planning-only or cannot edit files and run verification, stop within one minute and tell the user to switch modes. Do not produce a long implementation plan.
- Discovery is timeboxed to five minutes unless a concrete failing command is under investigation.
- Do not run `npm view`, `npm info`, `npm search`, package-version comparison, or other registry research. Use the repository manifests and lockfile. Add or change a dependency only when the selected task requires it and record the justification.
- Give any network-dependent install or audit command a 120-second maximum wait. If it stalls, terminate it, record the blocker, and continue only with safe repository-local work.
- Do not reread the entire Agent Pack. Read the governing files below, the selected task, its Source Refs, and directly affected runtime contracts only.

## First Commands

Run from the repository root:

```bash
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

Inspect `agent_pack/step_info.json` after the selector runs. If either command fails, diagnose that failure before selecting work.

## Mandatory Reads

- `agent_pack/00_start_here/LANGUAGE_POLICY.md`
- `agent_pack/00_start_here/SOURCE_OF_TRUTH.md`
- `agent_pack/00_start_here/SINGLE_TASK_PROTOCOL.md`
- `agent_pack/00_start_here/POST_TASK_SYNC_PROTOCOL.md`
- `agent_pack/step_info.json`
- The selected atomic task file
- Every Source Ref listed by that task
- Directly affected runtime code, tests, contracts, documentation, and environment examples

Read other pack files only when the selected task or a discovered contradiction requires them.

## Decision Logic

### If the selector returns an open or partial task

1. Execute exactly that one selected task.
2. Modify only allowed roots unless a necessary integration file is documented explicitly in completion evidence.
3. Mark the task In Progress before implementation.
4. Implement, test, verify, write completion evidence, close or honestly reclassify the task, synchronize the pack, rerun the selector, and stop.

### If the selector returns an in-progress task

Resume exactly that task after validating its state and existing changes. Do not select another task.

### If the selector returns no task

Do not invent work. Run a verification and truth-synchronization pass, report the closed graph state, and stop.

### If runtime truth disproves a Complete status

Do not hide the contradiction. Reopen or add only the smallest task allowed by the repository policy, synchronize indexes and the task board, then execute at most one selector-approved item.

### Before marking a task Blocked

A missing Production vendor, credential, endpoint, bucket, sandbox account, or external deployment topology is not automatically a blocker when product and security invariants are approved, a provider adapter isolates the integration, Local/Test use deterministic fakes, Preview/UAT/Production fail closed without configuration, and the external prerequisite can be reported honestly at Production Readiness. In that case, implement the selected task and record the absent external configuration as a readiness gap.

Mark a task Blocked only when the unresolved decision changes the domain contract, authorization model, security invariant, financial behavior, legal behavior, or irreversible data model and no safe reversible implementation boundary exists. Before blocking, output:

```text
candidate blocker:
blocker class:
domain contract affected:
security or financial invariant affected:
why configuration or an adapter is insufficient:
safe reversible implementation available: yes/no
decision: continue with gap / block
```

If `safe reversible implementation available` is yes, do not block only because Production credentials or vendor configuration are unavailable.

## Before Writing Code, Output

```text
mode:
selector result:
selected task:
task status:
graph state:
atomic task file:
allowed roots:
source refs:
relevant product truths:
verification commands available:
environment/readiness gaps:
blockers:
```

## Execution Rules

- Inspect actual runtime before changing it.
- Preserve unrelated user changes and never use destructive Git commands.
- Do not read real `.env` files, print secrets, use production data, or invent credentials.
- Do not silently change product truth, routes, state transitions, permissions, locales, or responsive scope.
- Keep the Agent Pack in English. The product UI remains Arabic-first RTL and retains every supported locale in the PRD.
- Add relevant positive, negative, authentication, RBAC, ownership, IDOR, validation, transition, replay, and concurrency tests.
- Update OpenAPI, Postman, generated contracts, route inventory, and screen bindings whenever the selected task changes them.
- A missing command or prerequisite is Blocked or Skipped with a reason; it is never Passed.

## Verification Gate

Run targeted checks for changed code first. Then run the repository-defined applicable gates discovered from package manifests and scripts, normally including:

```bash
node agent_pack/scripts/audit_pack.mjs
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
npm audit --audit-level=high
```

Use `npm.cmd` on Windows when PowerShell execution policy blocks `npm`. Run environment, API inventory, OpenAPI, Postman, integration, end-to-end, visual, accessibility, security, and performance commands only when those scripts exist and the selected task makes them applicable.

Do not run a live provider, database, or full-matrix test unless isolated prerequisites exist. A standalone MongoDB instance does not prove replica-set transaction behavior.

## Completion and Sync

Create `agent_pack/07_finish/<task_id>/completion.json` with at least:

- `taskId`
- `summary`
- non-empty `filesChanged`
- verification commands, exit codes, results, and notes
- `sourceEvidence`
- `knownGaps`
- `completedAt`

If all required criteria pass:

```bash
node agent_pack/scripts/set_task_status.mjs <task_id> complete
node agent_pack/scripts/sync_pack.mjs
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

If completion is impossible, set `partial` or `blocked` with an exact reason, run sync/audit/selector, and stop. Never write false evidence to force closure.

## Final Report

```text
mode:
selected task:
action performed:
runtime areas changed:
code files changed:
test files changed:
contracts/docs/env/pack changed:
commands and exit codes:
verification result:
blocked or skipped checks:
task final status:
pack sync result:
selector after completion:
finish consistency:
remaining risks:
```

Stop after one task or one verification-only pass. Do not start the next selected task.
