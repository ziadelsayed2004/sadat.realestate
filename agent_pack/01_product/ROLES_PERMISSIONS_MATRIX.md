# Roles and Permissions Matrix

| Role | Responsibility | Example Permissions |
|---|---|---|
| Super Admin | Full access to system, roles, settings, and audit | All, with safeguards against deleting the final Super Admin |
| Account Reviewer | Provider accounts, verification, documents, and restrictions | `providers.review`, `documents.review`, `accounts.restrict` |
| Property and Project Reviewer | Properties, projects, revisions, and reports | `properties.review`, `projects.review`, `property_reports.manage` |
| Content Editor | Articles, categories, About, Team, and homepage | `content.manage`, `home.manage` |
| Community Moderator | Posts, comments, and reports | `community.moderate` |
| Ads and Payments Manager | Requests, quotes, proofs, scheduling, and authorized commission operations | `ads.manage`, `proofs.review`, `commissions.view/manage` |
| Support and Follow-up Agent | Requests, viewings, contact, overdue items, and issues | `requests.manage`, `viewings.manage`, `issues.manage` |
| View Only | Read access without mutation or approval | `*.view` only |

## Enforcement Rules

- Permission granularity uses `module.action` with scope where required.
- An administrative role does not bypass ownership or sensitive projection rules without an explicit permission.
- The UI is not the enforcement boundary. The API returns `permissions` and `availableActions` and rejects the same forbidden request server-side.
- Every sensitive mutation records actor, target, reason, before, after, and traceId.
