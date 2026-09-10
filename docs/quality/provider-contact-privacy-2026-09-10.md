# Provider property contact fields and privacy

Implemented after direct inspection of Figma file `0HBdTNGROmmpC6S7OYa3iJ`, mobile contact card `6017:118760` (owning frame `6017:118695`).

- Added editable preferred contact time and provider internal notes, with bounded contract validation and Mongo persistence.
- Added independent phone, WhatsApp and email visibility switches, localized in editable Arabic and English JSON catalogs.
- Public property projection uses an explicit contact allowlist. Internal notes and visibility controls are never returned. Per-channel restrictions apply in addition to the existing global privacy and viewer authorization rules.
- Existing records without channel flags retain the previous visibility behavior, subject to global policy.

Verification: lint, typecheck, production build, translation key check and 15 targeted property/public tests passed. The real local property lifecycle passed after the change, including browser entry of the new fields, saving false visibility flags, reading their persisted values through the authenticated provider API, review, publication, hiding and restoration. Evidence: `guide-runs/property-lifecycle-local-latest.json` and the assertions in `scripts/verify-guide-property-lifecycle-local.mjs`.

Follow-up: the public response contract now has a separate strict contact schema that rejects internal notes and visibility controls even if accidentally included by a producer. The public property page renders the preferred contact time only inside the authorized contact response. Typecheck, 16 targeted API/contract tests and all 14 public-details UI tests passed after this follow-up.

Contact-role follow-up: account owner, sales agent and custom-number choices now persist as a bounded contactRole enum. Native radio inputs provide keyboard selection; mobile places the first option above the other two, as in the inspected source. This classifies the entered contact details; it does not assign an application role or automatically retrieve a staff account. Historical contacts without a role are shown as custom. The public contract rejects this provider-side metadata.

The real browser lifecycle passed with the sales-agent selection persisted and read back from the provider API. A local full-page mobile capture (`.local/contact-role-mobile.png`) was inspected: the role control renders, but the wizard stepper is vertical and input wrappers have excess card padding/gaps versus the source. These are confirmed visual defects for the next repair, not closed parity.

Remaining: full contact-card and mobile-stepper geometry parity. Runtime success does not close visual parity. Production verification is pending deployment by the user.
