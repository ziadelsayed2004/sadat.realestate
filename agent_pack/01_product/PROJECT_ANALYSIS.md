# Project Analysis — Sadat Real Estate Platform

## Executive Summary

This is a multi-surface real-estate platform, not a simple listing website. It contains an indexable public site, authentication and onboarding, a seeker dashboard, a property-provider dashboard, and an operational, financial, and content administration dashboard. The handoff defines 131 screens and states: 12 Public, 19 Auth, 10 Seeker, 24 Provider, and 66 Admin.

## Delivered Inputs

- A developer handoff dated 09 Aug 2026 with Figma, Drive, and Design System references.
- A complete registry of screens, roles, states, and responsive scope.
- An older Agent Pack from another project as an organizational reference only.
- Runtime implementation status is determined only from the current repository and `08_reality_sync/`, never from the original handoff snapshot.

## Product Surfaces

- Public: properties, details, comparison, developers, articles, community, About, and Team.
- Seeker: requests, viewings, saved properties, notifications, preferences, and account.
- Provider: onboarding and verification, properties and projects, CRM, viewings, ads, commission, notifications, and settings.
- Admin: users and RBAC, taxonomy, moderation, request operations, CMS, ads and payment proofs, commissions, settings, and audit.
- Locales: Arabic RTL, English LTR, and Simplified Chinese LTR.
- Responsive scope: Public and Auth on desktop, tablet, and mobile; the three dashboards are desktop-only in the current design handoff.

## Architecture Decisions

- Use an npm-workspaces monorepo to share contracts and UI without mixing runtime boundaries.
- API: Node active LTS, Express 5, strict TypeScript, MongoDB, and Mongoose.
- Web: React, TypeScript, and Vite. Public routes use SSR because property and article pages require indexable HTML; dashboards are protected application routes in the same web system.
- Version REST routes under `/api/v1`; OpenAPI is the delivery contract.
- Validate at runtime boundaries through shared schemas; TypeScript alone is not runtime validation.
- A MongoDB replica set is required for transaction and outbox paths; development topology must represent those semantics when such paths are tested.
- Separate private and public media behind a storage adapter. Do not hardcode an unapproved provider into the domain.

## Highest-Complexity Areas

1. Dynamic administrative RBAC with View Only and object-level authorization.
2. Provider review and private documents.
3. The multi-step property wizard, revisions, review, and publication.
4. A unified request model that preserves type-specific behavior, SLA, and internal notes.
5. Advertising with manual pricing, manual payment-proof review, and scheduling without an assumed gateway.
6. Commission policy, overrides, exceptions, effective dates, confirmations, and snapshots.
7. SEO, three locales, RTL/LTR, and SSR.

## Gaps That Must Not Be Invented

- Production OTP vendor selection; approved login identifiers and Admin-only password policy are resolved in Q-001.
- Provider-type fields and document requirements are resolved by Q-002; Q-003 still governs upload security, storage, MIME and size limits, retention, and authorized private delivery.
- Commission-trigger event, settlement, and collection method.
- Media/storage, maps, and notification providers.
- Advertising currency, taxes, quote validity, upload limits, and retention.
- Exact SLA by request type and assignment policy.

These gaps are tracked in `OPEN_QUESTIONS.md` and must be resolved before implementing the affected domain scope.
