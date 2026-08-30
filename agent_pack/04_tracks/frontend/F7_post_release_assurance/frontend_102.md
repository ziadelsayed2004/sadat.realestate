# frontend_102 - Provider Integration Closure and Admin Dependency Gate

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F7_post_release_assurance |
| Area | Provider integration closure |
| Kind | coordination |
| Sequence | 211 / 211 |
| Depends on | `frontend_101` |
| Screen ownership | Existing Provider implementation tasks remain the owners of their mapped screens; this Coordinator task intentionally has an empty `screens` array. |
| Current cursor | `PRV-01` |

## Purpose

Close the Provider surface from the live repository state, reconcile the current Agent Pack without rewriting historical reports, and publish an honest dependency decision before Admin. The canonical Figma file is `Odl1Epn2u6lIEuIMmABT7o`; the Provider page is `6017:4355`; `0HBdTNGROmmpC6S7OYa3iJ` is forbidden.

Arabic RTL and English LTR are the only execution locales. Existing Simplified Chinese files and snapshots are preserved and excluded. Admin is not opened, implemented, or tested by this task.

## Work contract

- Keep `frontend_102` as the only in-progress Agent Pack task while work is active.
- Repair the shared Provider rail using exact exported Figma outlined assets with explicit outer and leaf dimensions, active/focus/RTL/LTR behavior, and accessible names.
- Classify every Provider prerequisite as repository-owned, intentionally unavailable, superseded policy, or genuine external prerequisite.
- Preserve email-only identity and canonical email verification, safe HTTPS-only `mapUrl`, provider ownership/RBAC/IDOR, safe projections, and upload/document authorization.
- Review all prior Provider screenshot failures directly against expected/runtime/diff/canonical evidence; never update snapshots or weaken assertions without direct proof.
- Reconcile only current pointers, queues, checkpoints, and current state; keep historical reports immutable.
- Create the cleanup manifest before any deletion and preserve Chinese provenance unless the exact authorized ledger proves safe recovery.

## Verification

Focused Provider tests during implementation. After convergence, run the required non-admin AR/EN functional, accessibility, security, ownership, mapUrl, email-only, upload/document, normal visual, performance, build, inventory, OpenAPI, Postman, and Agent Pack gates once. End with either `POST_PROVIDER_INTEGRATION_ADMIN_READY` or `POST_PROVIDER_INTEGRATION_BLOCKED`, then stop without starting Admin.
