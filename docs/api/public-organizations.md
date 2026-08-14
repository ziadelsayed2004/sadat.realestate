# Public developer and company directory

The unauthenticated directory exposes approved developer companies and brokerage offices:

- `GET /api/v1/public/developers` lists approved organizations with bounded kind/search/sort/pagination filters.
- `GET /api/v1/public/developers/:slug` returns an approved organization profile.

An organization is public only when its organization review state and linked provider profile are both approved. The profile contains localized name/description, a backend-derived `verified: true` badge, published projects, and published active properties. Draft, pending, rejected, inactive, hidden, or archived records are excluded. Provider IDs, review fields, credentials, contact secrets, storage internals, and inactive inventory are never projected.
