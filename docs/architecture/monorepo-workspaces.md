# Monorepo workspace foundation

The repository has a private npm workspace graph for the API, web, contracts, UI, and shared configuration packages. `apps/api` now contains the minimal Express 5/TypeScript bootstrap; the other workspaces remain package-boundary skeletons without runtime behavior.

The root declares npm `>=11 <12` and Node `>=22.18 <25`. CI pins Node 24 while Windows Local may run Node 22.18; both are inside the supported engine range. Shared TypeScript settings are strict; the API build emits compiled runtime output.
