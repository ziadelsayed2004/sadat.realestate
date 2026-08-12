# Product Requirements — Sadat Real Estate Platform

## 1. Vision

Create a trusted platform for discovering and presenting Sadat City real estate and connecting seekers with property providers, supported by controlled review, advertising, commissions, content, and fine-grained administration.

## 2. Users

- Public visitor.
- Property seeker.
- Property provider: individual broker, office, or development company.
- Administrative user with configurable roles and permissions.

## 3. Success Outcomes

- Every published property has a clear source and a genuine review state.
- Users can search, filter, and compare two items through indexable pages.
- Visits convert into trackable contact, viewing, or property-search requests.
- Providers complete verified onboarding and manage properties and projects in one place.
- Administrative operations remain auditable and permission-safe.

## 4. Public Site

- Homepage, property listing, property details, and two-item comparison.
- Developer and company directory and profiles.
- Articles, community, and authenticated post creation.
- About Platform and Team pages.
- Only published content and approved organizations and properties are public.

## 5. Authentication and Onboarding

- Login, OTP, and seeker registration.
- Provider-type selection, account and business/company data, private documents, review, submission, and tracking.
- Provider states: Draft, Pending Review, Needs Information, Approved, Rejected, and Suspended.

## 6. Seeker

- Overview, requests and request details, viewings, saved properties, notifications, preferences, profile, and settings.
- Internal notes, assignment data, and audit data must never appear in seeker projections.

## 7. Provider

- Dashboard, My Properties, and an eight-step property wizard.
- Projects, customer requests, and viewing appointments.
- Advertising requests and private payment-proof upload when required.
- Read-only commission policy, notifications, and settings.

## 8. Administration

- Users, seekers, providers, document review, account reports, and restrictions.
- Taxonomy, locations, features, projects, properties, reviews, duplicates, and reports.
- Request operations, SLA, and request issues.
- Articles, community, About, Team, population counter, homepage, and CMS.
- Ads, quotes, proofs, calendar, banners, and financial review.
- Commission policies, accounts, exceptions, confirmations, and change history.
- Settings, SEO, privacy, display, administrator users, RBAC, notifications, and audit.

## 9. Publication and Comparison Rules

- Every published listing has an explicit Provider or Organization source.
- A verified badge appears only after genuine approval.
- Comparison is limited to two items and covers price, payment plan, area, layout, location, features, media, source, and project/developer.

## 10. Requests and Viewings

- Types: contact, viewing, property search, and provider-added customer request.
- Reference lifecycle: New, Contacted, Follow-up, Viewing, Interested or Negotiation, Completed or Closed, with type-specific allowed transitions.
- Assignment and internal notes are available only to authorized administrative or provider users.

## 11. Advertising and Payments

- Do not assume a universal public price; administrators issue a quote.
- Payment proofs are reviewed manually. Uploaded never means Approved or bank-verified.
- Reference lifecycle: Draft, Review, Waiting Pricing, Quote Sent, Waiting Payment, Scheduled, Active, and Ended.

## 12. Commissions

- A policy can be percentage-based, fixed, or exempt.
- Account overrides and effective-dated exceptions may apply.
- No universal commission value is hardcoded.
- Providers may view the effective policy but cannot modify it.

## 13. Locales and Devices

- Arabic (`ar`) with RTL is the primary visual locale. English (`en`) and Simplified Chinese (`zh-CN`) use LTR with the same routes, components, contracts, and permissions.
- Public and Auth surfaces support desktop, tablet, and mobile.
- Seeker, Provider, and Admin dashboards are desktop-only within the current approved design scope.

## 14. Privacy and Security

- Documents and payment proofs are private and delivered only through authorized, short-lived access.
- Sensitive endpoints require appropriate authentication, RBAC, ownership, validation, and rate limiting.
- Sensitive actions create append-only audit entries with reasons and before/after data where appropriate.
- Prevent IDOR, NoSQL injection, mass assignment, upload abuse, and PII leakage.

## 15. Common Interface States

Every applicable journey includes Loading, Empty, Error, Retry, and Success states, plus missing-image, long-text, expired, or unavailable variants when relevant.

## 16. Out of Scope Unless Approved

- AI matching or fabricated automated scoring.
- Automated government, bank, or ownership verification.
- An unspecified payment gateway.
- Responsive dashboard behavior beyond approved frames.
- Fixed operational numbers without a documented data source.

## 17. Definition of Done

- API contracts are documented and tested; permissions and availableActions are correct.
- Approved frames, locales, direction, and states are complete.
- Positive, negative, authorization, validation, and transition tests pass.
- No secrets, production mocks, or unsupported claims remain.
