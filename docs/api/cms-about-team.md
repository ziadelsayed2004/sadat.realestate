# About and team CMS content

About blocks and team members are strict localized CMS records with stable logical keys, deterministic order, activation, status, optimistic versioning, and reason-bearing administrative changes. Public projections include only records that are both `published` and `active`, sorted by `order` then key. Draft, inactive, and empty collections produce safe empty public states.

The public read surface is implemented at:

- `GET /api/v1/public/about`
- `GET /api/v1/public/team`

Both routes are unauthenticated, cacheable public reads returning `{ data: { items }, meta }`. The items contain only the shared public CMS projection; workflow status, activation flags, audit fields, updater identity, and other internal fields are excluded.

Team biographies, roles, and photos are content only; no unsupported employment, credential, or verification claims are inferred.
