# Auth Goal: AUTH-01 through AUTH-17 and aliases

You own the Auth surface only. Complete and verify `AUTH-01` through `AUTH-17` and their route aliases against the canonical Figma nodes and approved local source evidence.

## Required outcome

- Match Arabic RTL and English LTR across desktop, tablet, and mobile, including all visual states, copy, selectors, URLs, API behavior, accessibility, and error handling.
- Enforce email-only Seeker/Provider registration and passwordless verification. OTP request/verify accepts only `email`, `roleType`, and `purpose`; `/auth/verify-email` is the active route.
- Keep `/auth/verify-phone` as a browser-only legacy redirect to `/auth/verify-email`; it must never accept phone OTP or preserve a phone identity contract.
- Keep Admin email/password behavior out of this goal. Phone/WhatsApp may remain only in explicitly approved contact/business contexts outside identity forms.
- Do not treat historical screenshots or exports showing phone verification as evidence of the new behavior; retain their provenance and document the active email-only interpretation.
- Produce deterministic runtime-before/runtime-after, diff, metrics, review, accessibility, and interaction/API evidence for each screen. Close only as `REPAIRED_VERIFIED` or `VERIFIED_NO_CHANGE`.

## Lane boundary

You may edit Auth and Provider-auth UI owned by this lane, Auth-only tests, and Auth evidence files assigned by the Coordinator. Do not edit `packages/contracts`, `apps/api`, shared components, global styles/tokens, router, shared snapshots/E2E harnesses, Admin, Agent Pack manifests/ledgers, or another surface. Queue shared changes with the Coordinator. Do not create nested agents, branches, or worktrees.
