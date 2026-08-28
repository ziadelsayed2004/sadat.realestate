# Provider Goal: PRV-01 through PRV-24

This goal starts only in Wave 2 after the Coordinator reconciles Wave 1. You own the Provider surface and complete `PRV-01` through `PRV-24` against the canonical Figma nodes and approved local source evidence.

## Required outcome

- Match Arabic RTL and English LTR across the approved Provider desktop/responsive matrix, including onboarding, dashboard, properties, requests, documents, settings, states, accessibility, URLs, and real API behavior.
- Use the email-only Provider identity and Auth contract. Do not add phone to registration, login, OTP, grants, or identity projections. Secondary phone/WhatsApp can remain only as explicitly approved contact/business data.
- Provider property onboarding must accept a validated absolute HTTPS `mapUrl` (maximum 2048 characters) while retaining legacy location ID and coordinates. Do not fetch, geocode, or synthesize map links.
- Reconcile the supplementary phone-verification export as historical Auth evidence only. It is not a Provider screen and is not counted in the 131-screen baseline.
- Produce deterministic runtime-before/runtime-after, diff, metrics, review, accessibility, and interaction/API evidence for every screen. Close only as `REPAIRED_VERIFIED` or `VERIFIED_NO_CHANGE`.

## Lane boundary

You may edit Provider UI owned by this lane, Provider-only tests, and Provider evidence files assigned by the Coordinator. Do not edit `packages/contracts`, `apps/api`, shared components, global styles/tokens, router, shared snapshots/E2E harnesses, Admin, Agent Pack manifests/ledgers, or another surface. Queue shared changes with the Coordinator. Do not create nested agents, branches, or worktrees.
