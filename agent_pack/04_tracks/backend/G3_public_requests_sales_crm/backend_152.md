# backend_152 - Public Property Request Contract and Validation

| Field | Value |
|---|---|
| Program | SADAT_G1_G6_APPROVED_2026-08-30 |
| Phase | G3_public_requests_sales_crm |
| Sequence | 220 |
| Dependencies | `frontend_107` complete |
| Status | Open |

## Objective

Freeze and validate the guest-only PUB-03 `INQUIRY`/`VIEWING` contract from approved canonical copy and Figma evidence without inventing contact-time codes or privacy consent.

## Readiness and dependencies

- Verify G2 AR/EN runtime, the exact approved `preferredContactTime` AR/EN mapping, and privacy-disclosure decision evidence.
- Stop if the contact-time options are not explicitly approved; candidates such as morning/evening are not contract values until mapped.
- Production activation requires approved non-disruptive disclosure evidence; never fabricate `consentAt`.

## Allowed paths

Writes are limited to `packages/contracts/src/requests/**`, `apps/api/src/modules/requests/**`, `apps/api/tests/requests/**`, `apps/api/openapi/**`, `apps/api/postman/**`, and exact Agent Pack evidence/state files. Product data and secrets are not write targets.

## Forbidden paths and actions

- No `.env*`, `.local/**`, production data, phone-auth/login paths, unrelated contracts, images, snapshots, Git index, commit, push, deploy, reset, revert, stash, clean, deletion, or history rewrite.
- No `consentAt` without an approved displayed disclosure, no guessed enum, no Mongo ObjectId public reference, no arbitrary client metadata, and no nested agents.

## Ownership boundary

Backend owns the request contract/validation and its tests/artifacts. Shared contract changes must remain limited to this exact request scope. Frontend and CRM UI remain untouched.

## Implementation requirements

1. Allow only `requestType`, `propertySlug`, `fullName`, `phone`, approved `preferredContactTime`, optional message, and `handoffChannel`.
2. Derive locale, source route, property/provider/organization/project, attribution, audit, status, assignment, and timestamps server-side or from strict allowlists.
3. Normalize phone to E.164 with Egyptian default region where applicable; enforce body, idempotency, enum, and generic-error rules.
4. Return opaque UUID `publicReference`; never return internal Mongo `_id`.

## Migration and rollback

No database migration in this contract task. Rollback removes only the bounded contract/artifact change after restoring the prior compatible schema and leaves existing data untouched.

## Focused verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run api:audit
npm.cmd run openapi:validate
npm.cmd run postman:validate
node agent_pack/scripts/audit_pack.mjs
git diff --check
```

Add positive, negative, body-limit, enum, phone, idempotency-header, generic-error, and public-auth-boundary tests.

## Evidence requirements

Publish the exact AR/EN contact-time mapping, privacy decision, request/response schema, allowlist, validation/error matrix, OpenAPI/Postman hashes, and owner approval references.

## Markers and stop

Success: `TASK_backend_152_COMPLETE`

Blocked: `TASK_backend_152_BLOCKED_CONTACT_TIME_SOURCE`, `TASK_backend_152_BLOCKED_PRIVACY_APPROVAL`, `TASK_backend_152_BLOCKED_DEPENDENCY`, `TASK_backend_152_BLOCKED_OWNERSHIP`, or `TASK_backend_152_BLOCKED_VERIFICATION`.

Execute exactly one task. Do not start backend_153, persist data, open WhatsApp, commit, push, deploy, or use nested agents. Stop after one marker and handoff.
## Runtime, browser and Figma evidence boundary

- Runtime/API tasks must record deterministic runtime contracts, responses, security boundaries, and exit codes; browser evidence is `NOT_APPLICABLE` only when the task owns no UI.
- UI tasks must record AR/EN browser behavior, accessibility, responsive/device state, and no-update regression evidence.
- Figma evidence is required only for visual scope and must use the approved canonical source with direct review and transparent full-canvas metrics. Runtime snapshots never prove Figma parity.
- No masks, crops, overlays, hidden regions, or anti-alias masks are permitted. Missing authenticated source or external evidence is a blocker, not a pass.
