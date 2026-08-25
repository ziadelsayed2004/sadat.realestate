# UAT and Defect Closure Register

Status: repository-owned UAT matrix complete; no open Severity 1 or Severity 2 defect is evidenced by the executed local matrix.

## Executed UAT scope

- Canonical screen coverage: 131 entries from agent_pack/01_product/SCREEN_COVERAGE.json.
- Locale and direction cases: 131 Arabic RTL, 131 English LTR, and 131 Simplified Chinese LTR cases.
- Route state: every mapped route resolved through apps/web/src/routes/route-table.ts after replacing only route parameters with deterministic synthetic identifiers.
- Render state: every case produced non-empty SSR output without a configured API origin, so unavailable/loading/permission-safe shells were exercised without Production data.
- Projection safety: rendered output was checked for storageKey, signedUrl, privateUrl, internalNotes, and assignmentId leakage.
- API/screen binding: apps/web/tests/uat-binding.vitest.test.ts verifies canonical screen coverage, owning completed-task evidence, source mapping, runtime route resolution, runtime inventory/OpenAPI/Postman parity, and deterministic UAT fixture safety.

## Defect disposition

| ID | Severity | Area | Status | Evidence or required action |
|---|---|---|---|---|
| UAT-LOCAL-000 | None | All mapped screens | Closed | 393/393 route-locale cases passed in apps/web/tests/uat-matrix.vitest.test.ts. |
| UAT-TOOLING-001 | None | Full Web Vitest harness | Closed | The inventory parity test exceeded Vitest's default 5-second timeout only under the full 59-file suite. Its bounded test timeout is now 30 seconds; the complete suite passed 59 files / 366 tests. |
| DESIGN-EXCEPTION-ADM-54 | Design debt | Admin settings reference | Accepted non-blocking exception | Project Owner waived only the unavailable direct ADM-54 source comparison. Substitute Admin design-system, sibling-frame, functional, RBAC, visual-regression, locale/direction, Desktop, and accessibility evidence remains required. Direct pixel-perfect comparison was not performed. |
| READINESS-NATIVE-001 | External prerequisite | Native Ubuntu smoke | Deferred | Nginx, systemd, authenticated MongoDB rs0, ClamAV, Certbot, backup, restore, and rollback require an isolated Ubuntu execution host and current evidence. |
| READINESS-PREVIEW-001 | External prerequisite | Preview/UAT infrastructure | Deferred | Isolated MongoDB replica set, private storage/scanner, OTP provider, monitoring, backup/restore drill, and deployment platform configuration are not supplied. No live Preview/Production claim is made. |
| TOOLING-SECURITY-CHECK-001 | Tooling gap | Security script | Deferred | npm.cmd run security:check is not defined. Existing browser/session security tests, API security tests, artifact assertions, and npm audit remain the repository-owned checks. |

## Closure rule

The deferred readiness items are not product Sev1/Sev2 defects and must not be converted into fabricated passes. A new runtime, security, legal, data-loss, cross-owner, or release-blocking defect must be added here with its owning task before frontend_090 is closed.
