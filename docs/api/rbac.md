# Administrative roles and permissions

The RBAC engine stores dynamic administrative roles as an allowlisted set of stable `admin:<module>.<action>` capability keys. Persisted roles never contain wildcard grants. The first Super Admin is the only principal whose immutable bootstrap guard resolves to the full current capability catalog; no editable role or assignment can create that bootstrap authority.

Role access modes are `custom` and `view_only`. A View Only role may contain only capabilities ending in `.view`, and this invariant is validated by shared request contracts, the service layer, and the persistence model. A custom role receives only its explicit capabilities; mutation capabilities do not implicitly bypass later ownership, assignment, review-scope, or sensitive-projection policies.

Administrator-role assignments are bounded to ten unique active roles per Admin identity and use optimistic versions. Effective permissions are the sorted union of active assigned roles. Missing users, non-Admin targets, disabled roles, suspended accounts, stale assignment versions, and unassigned administrators fail closed. The assignment service is implemented for the administrator lifecycle boundary; its HTTP integration remains owned by `backend_121`, so no unplanned assignment route is documented as active here.

## Active HTTP routes

- `GET /api/v1/admin/roles` requires `admin:roles.view` and returns role projections, the approved capability catalog, the caller's effective permissions, and server-derived `availableActions`.
- `POST /api/v1/admin/roles` requires `admin:roles.manage` and a 3-1,000 character reason, then creates a strict custom or View Only role.
- `PATCH /api/v1/admin/roles/:roleId` requires `admin:roles.manage`, a reason, and the request `version` for lost-update protection. It may update the display name, description, access mode, permissions, or active state.

Every route requires a valid access token for a verified Admin account and responds with `Cache-Control: no-store`. Public, Seeker, Provider, suspended Admin, malformed-token, unassigned Admin, and insufficient-capability requests are rejected by the API. Role names are display data and may be localized by the product UI; permission keys remain stable English logical values. Arabic remains the primary RTL locale, with English and Simplified Chinese LTR using the same contracts and authorization outcomes.

## Error and concurrency contract

Strict schemas reject unknown fields, unknown capabilities, duplicate capabilities, wildcards, invalid View Only mutations, malformed identifiers, and empty patches. Stable RBAC failures distinguish forbidden access, missing roles, duplicate normalized names, and stale optimistic versions without exposing database details.

Role deactivation immediately removes that role from effective authorization resolution. Updating an existing role changes the permissions of every assignment that references it; callers must use the current version to make that security-sensitive change deliberately.

Role creation, role mutation, and administrator-role assignment append a redacted, reason-bearing record to the unified audit log in the same MongoDB transaction as the protected state change. If audit persistence fails, the sensitive mutation fails rather than leaving an unaudited authorization change.

## Object authorization policy

Object authorization is a separate, fail-closed step after authentication and capability resolution. Modules declare stable action rules that combine the actor role, an optional explicit Admin capability, allowed persisted resource states, and at least one server-established relation: `owner`, `assigned`, `review_scope`, or `global`. A `global` relation is valid only for an Admin rule with an explicit capability; holding a capability never silently satisfies an owner, assignment, or review-scope rule.

Ownership, assignment identifiers, review-scope identifiers, and resource state must come from trusted repository or service data, never request flags. Missing, malformed, or mismatched data yields no action. Public and Seeker principals do not gain private Provider or administrative access from this infrastructure.

The reusable policy evaluator is the single source for both mutation authorization and ordered, de-duplicated `availableActions`. Consequently, a hidden action and its rejected server mutation have the same role, permission, state, and object-relation outcome. Domain modules retain responsibility for defining their own stable action/state keys, repository query scopes, explicit response projections, and IDOR-safe not-found/error mapping.
