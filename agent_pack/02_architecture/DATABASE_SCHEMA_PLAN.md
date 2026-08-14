# Database Schema Plan

| Aggregate or Collection | Purpose | Initial Core Indexes |
|---|---|---|
| users | Shared identity and state | Unique normalized phone/email, roleType, status |
| sessions | Refresh rotation and reuse detection | Unique tokenHash, userId, TTL expiresAt |
| otp_challenges | Hashed OTP challenges | target + purpose, TTL expiresAt, attempts |
| seeker_profiles | Seeker data and preferences | Unique userId |
| provider_profiles / applications | Provider type and onboarding | Unique userId, status + updatedAt |
| provider_documents | Private-document metadata | providerId + type, status |
| admin_profiles / roles / admin_role_assignments / admin_bootstrap | Administration, one-time first-Super-Admin bootstrap guard, and RBAC | Unique profile userId, bootstrap key/user, normalized role name, and assignment Admin user |
| admin_credentials | Admin-only Argon2id credential hashes | Unique userId |
| audit_logs | Append-only, reason-bearing, redacted sensitive-action audit | actorId + createdAt, targetType + targetId + createdAt, action + createdAt, traceId + createdAt, createdAt |
| account_state_transitions | Immutable reason-bearing account and Provider-review transition evidence | targetUserId + createdAt, providerApplicationId + createdAt, actorAdminId + createdAt |
| organizations | Developer, company, or office | Unique slug, status + name search |
| locations / neighborhoods | Geographic hierarchy | Unique slug, parent/order/active |
| property_categories / types | Taxonomy | Unique slug, active + order |
| features / services | Property attributes | group + active + order |
| projects / project_revisions | Projects and review | providerId + status, slug, location |
| properties / property_revisions | Listings and units | providerId + status, published search indexes, geo |
| assets | Public/private media metadata | ownerType + ownerId, visibility + status |
| favorites | Seeker saved properties | Unique seekerId + propertyId |
| requests / request_events | Request types and history | type + status + updatedAt, seeker/provider/assignee, dueAt |
| notifications | Inbox | recipientId + readAt + createdAt |
| outbox_events | Reliable events | status + availableAt, unique dedupeKey |
| article_categories / articles | Content | slug + locale/status, publishAt |
| community_posts / comments | Community | status + createdAt, postId + createdAt |
| moderation_reports | Reports | targetType + targetId + status |
| ad_placements / ad_requests | Advertising | placement + status + schedule, providerId |
| payment_proofs | Private proof metadata | adRequestId + status |
| banners | Banners | placement + status + start/end |
| commission_policies | Policies and versions | scope + effectiveFrom/effectiveTo |
| commission_exceptions | Account exceptions | accountId + active dates |
| commission_confirmations | Policy acknowledgements | Unique accountId + policyVersion |
| settings | Versioned settings | Unique namespace + key |

Final indexes must be justified by implemented queries and `explain` results, not this table alone. Store localized content in validated keyed objects or defined subdocuments, never unbounded free-form fields.
