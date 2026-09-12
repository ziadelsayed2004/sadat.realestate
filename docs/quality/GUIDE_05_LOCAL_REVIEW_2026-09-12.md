# GUIDE-05 local functional evidence review — 2026-09-12

Scope: seeker dashboard counts, recent activity, failure/empty presentation, and onward navigation. Global journey status remains PARTIAL; this review does not cover Production or Figma acceptance.

| Requirement | Evidence file under `docs/quality/guide-runs/` | Proven scope |
|---|---|---|
| Empty account | seeker-overview-empty-local-latest.json | Real browser/API/Mongo: six zero counters, three empty arrays/panels, no business writes, six locale/device combinations. |
| Retry | seeker-overview-recovery-local-latest.json | Initial network failure injected by request abort, real retry HTTP 200, no document reload, values agree with API. |
| Owned counts | seeker-overview-counts-local-latest.json | Isolated Mongo owned/foreign rows, empty counts, available favorite filtering and deactivation. |
| Counter/list consistency | seeker-overview-count-browser-local-latest.json | Updated API/browser: available favorite 1 -> inactive 0, record retained and list agrees. |
| Nonempty activity | seeker-overview-projection-local-latest.json | Three-row ordering/limit, independent five-row counts, foreign exclusion, top-level private-field exclusion. |
| Navigation | seeker-overview-navigation-local-latest.json | Browser request detail, viewing list, notification panel and explicit notification destination; scope must be read from latest executed report. |

Write authority: request creation uses strict per-type payload schemas. Admin notes are stored outside payload. `apps/api/tests/seeker/requests-projection.test.ts` verifies administrative payload injection rejection and projection exclusion; arbitrary legacy database corruption is not covered.

Revision relevance: `b684b46` changes overview saved count. Count/browser-empty/projection/navigation evidence thereafter applies to that revision. Earlier retry evidence still proves Web behavior (unchanged); its old nonempty API values are not used to prove new aggregation semantics.

Applicability: overview is read-only. Duplicate mutation, moderator reason and optimistic write-version rollback are not requirements of GET overview; they belong to underlying write journeys. Existing common authentication guard precedes protected APIs; a dashboard-specific old-session/role acceptance check remains unverified by this set.

Outstanding: dashboard authorization through the full runtime (current account and session); Production deployment verification; Figma SEK-01 approval; final global gates. Do not count this review as a fully closed journey or a complete goal.
