# Project Execution Policy

## Mandatory Order

1. Discovery and architecture decisions.
2. Backend foundation, security, and contracts.
3. Identity and RBAC.
4. Master data and CMS.
5. Projects, properties, media, and reviews.
6. Search, seeker features, requests, and viewings.
7. Content and community.
8. Advertising and payment proofs.
9. Commissions, administration, and reports.
10. Backend security, readiness, and handoff gate.
11. Frontend foundation and Vite SSR.
12. Public, Auth, Seeker, Provider, and Admin surfaces in that order.
13. End-to-end, visual, localization, accessibility, performance, and release gates.

## One-Task Rule

- The selector chooses the first Open or Partial task whose dependencies are complete.
- At most one task may be In Progress.
- The runner must not begin the next task in the same run.
- A missing Production vendor, credential, endpoint, bucket, sandbox account, or external deployment topology is not automatically a task blocker when product and security invariants are approved, an adapter isolates the integration, Local/Test use deterministic fakes, higher environments fail closed, and the missing configuration can be reported honestly at Production Readiness.

## Blocker Classification

Mark a task Blocked only when the unresolved decision changes the domain contract, authorization model, security invariant, financial behavior, legal behavior, or irreversible data model and no safe reversible implementation boundary exists. Missing external configuration is a readiness gap when an approved adapter boundary and fail-closed environment behavior allow safe implementation.

Before marking a task Blocked, report:

```text
candidate blocker:
blocker class:
domain contract affected:
security or financial invariant affected:
why configuration or an adapter is insufficient:
safe reversible implementation available: yes/no
decision: continue with gap / block
```

If `safe reversible implementation available` is yes, the task must not be blocked only because Production credentials or vendor configuration are unavailable.

## Backend Gate

`frontend_000` cannot start until `backend_138` is closed with evidence for build, lint, typecheck, tests, security, inventory, readiness, and handoff.

## Statuses

| Status | Meaning |
|---|---|
| open | Not started |
| in_progress | The single task currently being executed |
| partial | Implementation exists, but acceptance is incomplete |
| blocked | A specific documented prerequisite prevents completion |
| complete | Code, verification, and evidence are complete |
