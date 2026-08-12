# Business Rules

| ID | Rule | Enforcement |
|---|---|---|
| BR-001 | Every published property has a clear source | Model, publish validation, and projections |
| BR-002 | The verified badge represents genuine approval only | Backend-derived flag |
| BR-003 | Comparison contains at most two items | API validation and UI guard |
| BR-004 | Seekers never see internal notes, assignments, or audit data | Projection and negative tests |
| BR-005 | Sensitive reject, needs-information, and suspend actions require a reason | Validation and audit |
| BR-006 | Unauthorized actions are hidden or View Only | RBAC, availableActions, and UI |
| BR-007 | A payment proof is manually reviewed and is not bank verification | State machine and interface copy |
| BR-008 | Advertising has no assumed universal public price | Quote workflow |
| BR-009 | Commission is not a universal hardcode | Policy resolver |
| BR-010 | Public content must be Published | Query scopes |
| BR-011 | Documents and payment proofs never use permanent public URLs | Private storage gateway |
| BR-012 | Arabic RTL and English/Simplified Chinese LTR use the same contracts | Localization contracts |
| BR-013 | No AI, government, bank, or ownership automation without a real approved integration | Product guardrail |
| BR-014 | Production cannot display fabricated operational numbers | Data source and tests |
| BR-015 | A Screen ID is a QA reference, not a mandatory route name | Coverage matrix |
