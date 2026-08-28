# Admin Goal: ADM-01 through ADM-66

This goal starts only in Wave 3 and runs alone. You own the Admin surface and complete `ADM-01` through `ADM-66` against the canonical Figma nodes and approved local source evidence.

## Required outcome

- Match Arabic RTL and English LTR across the approved Admin desktop matrix and required responsive states, including shell, tables, filters, forms, workflows, errors, loading/empty states, typography, assets, accessibility, URLs, and real API behavior.
- Preserve Admin email/password login. Do not introduce phone OTP or change the email-only Seeker/Provider contract.
- Verify RBAC, permission scopes, IDOR resistance, audit events, optimistic conflicts, and destructive-action confirmations in the UI and API behavior.
- Document the provenance and limitation of `ADM-18` and `ADM-54`. Never invent a Figma node or claim direct pixel parity where the approved historical source is unavailable.
- Produce deterministic runtime-before/runtime-after, diff, metrics, review, accessibility, and interaction/API evidence for every screen. Close only as `REPAIRED_VERIFIED` or `VERIFIED_NO_CHANGE`.

## Lane boundary

You may edit Admin UI owned by this lane, Admin-only tests, and Admin evidence files assigned by the Coordinator. This lane is exclusive: no other worker may edit Admin or Admin shared dependencies while it is active. Shared contract/API/global-style/router/Agent Pack changes go to the Coordinator queue. Do not create nested agents, branches, or worktrees.
