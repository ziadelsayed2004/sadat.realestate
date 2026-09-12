# GUIDE-06 local acceptance review — 2026-09-12

Scope: an authenticated seeker opens owned requests, reviews list and detail state, and follows status changes. This is a local functional review; it is not Figma acceptance or Production verification.

| Requirement | Evidence | Scope and conclusion |
|---|---|---|
| Contact request creation and final state | `guide-runs/guide-04-local-latest.json` | PASS: real browser/API/MongoDB creation, Admin review/contact/resolve/close, and final Seeker browser state. |
| Property-search creation, validation, duplicate prevention and ownership | `guide-runs/seeker-property-search-local-latest.json` | PASS: isolated real HTTP/MongoDB create/list/detail/cancel; invalid range 400, duplicate 409, foreign detail hidden, reason/version/audit persisted and database dropped. |
| Property-search list and detail UI | `guide-runs/seeker-requests-recovery-local-latest.json` | PASS: persisted request rendered in owned list and detail with safe advanced payload, AR/EN on Desktop/Tablet/Pixel 5; no overflow; temporary requests and sessions removed. |
| Empty results and reset | `guide-runs/seeker-requests-recovery-local-latest.json` | PASS: empty search and reset recover without document navigation in all six locale/device combinations. |
| Network recovery | `guide-runs/seeker-requests-recovery-local-latest.json` | PASS: offline filter shows actionable retry, then real API 200 restores both request rows without navigation. |
| Cancel validation | `guide-runs/seeker-requests-recovery-local-latest.json` | PASS: empty and whitespace reasons produce no transition request and no Mongo mutation. |
| Ownership, current account state and role authorization | `guide-runs/request-guarantees-local-latest.json` | PASS for scoped request APIs: foreign access hidden; current status and live RBAC override old token claims. |
| Concurrent writes, version conflict and atomic audit | `guide-runs/request-guarantees-local-latest.json` | PASS: one concurrent success/one 409, replay has no duplicate effect, and forced audit failures roll back mutation and audit. |
| Safe browser projection | Current `seeker-requests.spec.ts` plus real property-search browser run | Internal assignment, audit, actor and token fields are absent; the fixture visual suite is additional layout evidence only. |
| Responsive detail layout | `seeker-requests.spec.ts` reviewed baselines and geometry | AR/EN at 393/768/1280/1551; timeline and summary stay contained and do not intersect. This does not prove Figma pixel parity. |

Applicability: `viewing` is accepted separately under GUIDE-07. `provider_customer` is a provider-owned operational flow covered under GUIDE-16 and is not a Seeker-created GUIDE-06 request. The Seeker-facing request types exercised here are contact and property search.

Remaining outside this local review: Production execution on the deployed revision; independent Figma acceptance for SEK-02/03/04; final project-wide quality gate. Rich property/provider/avatar/contact fields shown in Figma are absent from the approved safe projection and were not fabricated. Demo purge and launch remain postponed by the owner.
