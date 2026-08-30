# frontend_103 - Admin Wave 3 - ADM-01 through ADM-66

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | Admin Wave 3 reconciliation |
| Kind | coordination |
| Sequence | 212 / 212 |
| Depends on | `frontend_102` |
| Screen ownership | Coordinator owns the shared Admin shell, router, contracts, API/security paths, evidence, and Agent Pack. No nested worker is assigned. |
| Current cursor | `ADM-01` |

## Purpose

Reconcile the Admin surface from `ADM-01` through `ADM-66` against the canonical owner-controlled source and the live local runtime. The canonical Figma file is `Odl1Epn2u6lIEuIMmABT7o`; `0HBdTNGROmmpC6S7OYa3iJ` is forbidden. The only execution locales are Arabic RTL and English LTR. Existing Simplified Chinese files and snapshots remain preserved and excluded.

This task starts only after the isolated transaction-capable local Mongo replica set and first Super Admin bootstrap gate succeed. It does not reopen or rewrite `frontend_102` or any historical non-Admin report.

## Screen order and source exceptions

- Process the queue one screen at a time from `ADM-01` to `ADM-66`.
- Record the exact queue node, route, administrator role, Desktop scope, locale/direction, runtime state, API projection, RBAC/IDOR boundary, ownership, interaction, accessibility, and reviewed visual evidence.
- Keep `ADM-18` as `BLOCKED_SOURCE` if its exact clone frame or an approved current source is still unavailable. Never invent a node or historical comparison.
- Use the Project Owner decision and `ADM-54.owner-authored.html/.png` for `ADM-54`, with explicit provenance and no claim of historical Figma recovery.
- Use only `REPAIRED_VERIFIED`, `VERIFIED_NO_CHANGE`, `PARTIAL_EXTERNAL`, or `BLOCKED_SOURCE`. A material repository-owned defect keeps the screen open until repaired and verified.

## Work contract

- Preserve the installed standalone Mongo service and all pre-existing data. The Admin runtime uses a separate single-node replica-set data directory and port.
- Keep first-admin creation transactional and idempotent; a restart must not create a duplicate Super Admin.
- Preserve email/password Admin identity, Argon2 hashing, in-memory session boundaries, expiry/revocation, RBAC, least privilege, audit records, safe projections, NoSQL/operator-input rejection, rate limits, upload/private-file authorization, pagination, optimistic concurrency, and destructive-action confirmation.
- Implement the smallest repository-owned repair with focused contract, validation, security, API, UI, and AR/EN tests. Do not use masks, screenshot-only markup/CSS, cropping, invented data/assets, weakened assertions, or premature snapshot updates.
- Run normal no-update visual snapshots only after direct source review. Do not execute or update zh-CN.

## Verification

After convergence, run the single Admin gate set: Admin typecheck and lint; focused Web Vitest and Admin AR/EN Desktop functional/accessibility/security/route tests; API unit/integration/RBAC/IDOR/audit/upload tests; OpenAPI, Postman, and inventory validation; responsive Desktop checks; performance and bundle budget; build; dependency audit; local replica-set bootstrap/restart/seed/smoke; `git diff --check`; and Agent Pack sync/audit.

Finish with an Arabic reconciliation report, cleanup manifest, atomic commit plan, and one of `ADMIN_WAVE_RECONCILED_FINAL_INTEGRATION_READY`, `ADMIN_WAVE_READY_WITH_EXTERNAL_EXCEPTIONS`, or `ADMIN_WAVE_BLOCKED`. Do not commit or push.
