# Commission category, rental and property-card review — 2026-10-27

The owner confirmed sale rates of 2% for property owners and 1.5% for offices, individual company agreements, and rental commission of half one month's rent. These are editable agreements, not hard-coded calculation defaults. The old `individual_broker` role identifier remains unchanged for compatibility; its user-facing name is Property owner / مالك عقار.

## Repairs

- Persisted provider-type policies were not considered by the provider commission repository, which only loaded default policies. Resolution now matches the account profile and respects exception → account assignment → scoped policy → fallback precedence. Unrelated account categories are excluded.
- Added policy approval/stopping/editing through a permission-protected, versioned PATCH boundary and transactional audit writes. The form saves once, locks the draft, and exposes explicit approval; the list supports changing sale and rent independently.
- Optional `rentMonths` survives persistence and administrative/provider/resolver projections. `.5` means half of monthly rent, not a percentage of total lease value. Legacy records remain unspecified. Active exceptions cannot be changed retroactively, and exemptions cannot charge rent.
- Replaced scope-key text entry for categories with named choices. Added owner/office presets, company-account guidance, a collapsed help panel, and updated the admin user guide.
- The desktop card's fourth numeric feature was floor number with an incorrect eye icon. The eye was removed and the floor label made visible; the real views badge is unchanged.
- An explicit, previewable server setup command creates agreed owner/office policies without overwriting any existing category decision or touching company agreements. Re-running preserves edits and stopped policies.

## Verification

- Focused API tests: category-specific values, legacy account IDs, account/exception precedence, policy approval/edit/version conflicts and authorization, setup preview/idempotence/preservation.
- Focused UI tests: 22 passing, including both agreed category presets, separate rental input and approval, and provider refresh/acknowledgement behavior.
- Chromium and WebKit browser checks at 390 and 1440 pixels: create/approve owner agreement, change rent `.5 → 1` while retaining sale rate, viewport fit, and distinct views `0` / floor `2` presentation. Browser tests use local fixtures; they do not create agreements on production.
- Browser screenshots and machine-readable evidence are ignored under `.local/commission-setup-qa/`. No production account or content was changed from this environment.
- The feature adds approximately 15.6 KB uncompressed JavaScript; a bounded additional 16 KiB budget is documented, with per-chunk and stylesheet limits retained.
