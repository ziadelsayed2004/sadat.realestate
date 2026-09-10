# Provider property contact fields and privacy

Implemented after direct inspection of Figma file `0HBdTNGROmmpC6S7OYa3iJ`, mobile contact card `6017:118760` (owning frame `6017:118695`).

- Added editable preferred contact time and provider internal notes, with bounded contract validation and Mongo persistence.
- Added independent phone, WhatsApp and email visibility switches, localized in editable Arabic and English JSON catalogs.
- Public property projection uses an explicit contact allowlist. Internal notes and visibility controls are never returned. Per-channel restrictions apply in addition to the existing global privacy and viewer authorization rules.
- Existing records without channel flags retain the previous visibility behavior, subject to global policy.

Verification: lint, typecheck, production build, translation key check and 15 targeted property/public tests passed. The real local property lifecycle passed after the change, including browser entry of the new fields, saving false visibility flags, reading their persisted values through the authenticated provider API, review, publication, hiding and restoration. Evidence: `guide-runs/property-lifecycle-local-latest.json` and the assertions in `scripts/verify-guide-property-lifecycle-local.mjs`.

Remaining: full contact-card geometry parity, source contact-role tabs and public rendering of preferred contact time. Runtime success does not close visual parity. Production verification is pending deployment by the user.
