# GUIDE-23 local functional acceptance — 2026-09-12

## Reviewed scope

GUIDE-23 covers the administrator advertising-request queue, pending and approved payment proofs, payment review, advertising calendar, and financial review for full and limited administrators.

| Requirement | Evidence | Result |
| --- | --- | --- |
| Six responsive surfaces | `guide-runs/remaining-surfaces-local-latest.json` | ADM-33 through ADM-38 passed in Arabic and English on Desktop, Tablet, and Pixel 5 with real API responses, no page errors, and no horizontal overflow. |
| Advertising-request review | `guide-runs/guide23-admin-ads-payments-local-latest.json` | A real review moved a request from `review` to `waiting_pricing`, incremented its version and history, and wrote one reasoned audit with request and trace IDs. A stale competing decision returned 409. |
| Payment-proof review | The GUIDE-23 report | A clean pending proof was approved, versioned, and audited. Replaying the same approval was idempotent and did not duplicate the audit; a stale opposite decision returned 409. |
| Validation, empty, and recovery | The GUIDE-23 report | Invalid filters and short reasons returned 400 without writes, an absent provider produced a true empty result, and ADM-33 recovered from browser offline mode through Retry without a reload in all six locale/device configurations. |
| Authorization and current state | The GUIDE-23 report | Anonymous access returned 401, limited-administrator mutations returned 403, and a full administrator's existing token was denied after suspension. The administrator was restored immediately. |
| Atomic audit | `guide-runs/admin-ads-payments-guarantees-local-latest.json` | Injected durable-audit failures rolled back advertising-request and payment-proof status, version, history, and inserted audits. Retrying committed exactly one audit per review; stale competing reviews wrote nothing. |
| Cleanup | Both GUIDE-23 reports | Temporary advertising, payment, audit, and session records plus the isolated guarantee database were removed. Existing Demo data was unchanged. |

## Defects fixed during review

- Advertising-request review now records its mandatory audit in the same MongoDB transaction as the status and history update.
- Payment-proof review now records its mandatory audit in the same MongoDB transaction as the status and history update.
- Both audit records retain the decision reason plus request and trace identifiers.

## Remaining global work

GUIDE-23 remains `PARTIAL` globally until independent Figma acceptance, the final project-wide quality gate, and Production verification are complete. Production remains deferred while the project stays in Demo mode.

No Production launch or Demo purge was executed.
