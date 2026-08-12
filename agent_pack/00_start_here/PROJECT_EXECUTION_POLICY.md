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
- A missing external prerequisite becomes Blocked with a precise reason; never invent a substitute that changes product behavior.

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
