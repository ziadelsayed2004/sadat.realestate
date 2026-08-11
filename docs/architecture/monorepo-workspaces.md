# Monorepo workspace foundation

The repository has a private npm workspace graph for the API, web, contracts, UI, and shared configuration packages. `apps/api` now contains the minimal Express 5/TypeScript bootstrap; the other workspaces remain package-boundary skeletons without runtime behavior.

The root declares npm `11.6.4` and Node `>=24 <25`. The current environment is Node 22, so Node 24 CI validation remains a prerequisite. Shared TypeScript settings are strict; the API build emits only its compiled bootstrap output.
