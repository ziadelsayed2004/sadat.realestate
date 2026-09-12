# GUIDE-16 customer-request local review — 2026-09-12

## Reviewed scope

The provider customer-request subflow is covered through real local browser, API, and MongoDB execution. This review does not mark all of GUIDE-16 locally accepted because the journey also includes the provider projects and viewing work queues.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Browser creation and client validation | `guide-runs/provider-customer-recovery-local-latest.json` | Arabic and English on Desktop, Tablet, and Pixel 5; an empty form sends no request, a valid form returns 201, the owned row appears without navigation, and MongoDB contains the exact submitted email. |
| Empty and recovery states | `guide-runs/provider-customer-recovery-local-latest.json` | A no-result search clears without reload; an offline filter reaches retry and recovers after reconnect; no horizontal overflow in six runs. |
| API validation, duplicate handling, ownership, role, and current account state | `guide-runs/provider-customer-request-local-latest.json` | 400, 409, 404, and 403 paths preserve the expected database state. |
| Versioned transition and audit | `guide-runs/provider-customer-request-local-latest.json` | A valid contact transition persists status, version, reason, and actor audit data. A stale version returns 409 without mutation. |
| Atomic audit rollback | `guide-runs/provider-customer-request-local-latest.json` | A forced audit failure returns 500 and rolls back both the request transition and audit insert. |
| Cleanup | Both evidence runs | Isolated database and all temporary local browser requests/sessions are removed. Demo/QA data is preserved. |

## Responsive defect fixed

On Pixel 5, the fixed provider navigation was above the PRV-17 modal footer and intercepted the Save button. Provider customer-request, viewing, and advertising modal backdrops now use layer 50, above the navigation layer 40. The real PRV-17 browser flow passes on both mobile locales; focused PRV-18 and PRV-19 mobile AR/EN tests pass 4/4.

## Remaining GUIDE-16 work

- Review the project-list path as part of the combined operational journey.
- Reconcile any remaining viewing queue empty/retry evidence required at journey level.
- Complete independent Figma acceptance for PRV-15/16/17/18 and verify Production after explicit approval.

No Production launch or Demo purge was executed.
