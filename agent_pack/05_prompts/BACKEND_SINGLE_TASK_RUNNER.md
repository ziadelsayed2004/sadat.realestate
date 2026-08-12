# Backend Single-Task Runner

Use `MASTER_SINGLE_TASK_RUNNER.md` and apply these backend constraints:

- Keep product APIs under `/api/v1`; operational health routes may remain unversioned when the architecture defines them that way.
- Use runtime validation and explicit response projections.
- Every sensitive route receives the applicable authentication, RBAC, ownership, validation, and rate-limit controls.
- Add positive, unauthenticated, unauthorized or IDOR, validation, and invalid-state tests as applicable.
- Never document a planned endpoint as active.
- Do not begin frontend work before `backend_138` is Complete.
- Do not query package registries for planning. Use the checked-in lockfile and terminate stalled network commands within the master runner's time limit.
