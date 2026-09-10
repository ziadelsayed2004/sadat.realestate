# Provider property contact fields and privacy

Implemented after direct inspection of Figma file `0HBdTNGROmmpC6S7OYa3iJ`, mobile contact card `6017:118760` (owning frame `6017:118695`).

- Added editable preferred contact time and provider internal notes, with bounded contract validation and Mongo persistence.
- Added independent phone, WhatsApp and email visibility switches, localized in editable Arabic and English JSON catalogs.
- Public property projection uses an explicit contact allowlist. Internal notes and visibility controls are never returned. Per-channel restrictions apply in addition to the existing global privacy and viewer authorization rules.
- Existing records without channel flags retain the previous visibility behavior, subject to global policy.

Verification: lint, typecheck, production build, translation key check and 15 targeted property/public tests passed. The real local property lifecycle passed after the change, including browser entry of the new fields, saving false visibility flags, reading their persisted values through the authenticated provider API, review, publication, hiding and restoration. Evidence: `guide-runs/property-lifecycle-local-latest.json` and the assertions in `scripts/verify-guide-property-lifecycle-local.mjs`.

Follow-up: the public response contract now has a separate strict contact schema that rejects internal notes and visibility controls even if accidentally included by a producer. The public property page renders the preferred contact time only inside the authorized contact response. Typecheck, 16 targeted API/contract tests and all 14 public-details UI tests passed after this follow-up.

Remaining: full contact-card geometry parity and source contact-role tabs. Runtime success does not close visual parity. Production verification is pending deployment by the user.
