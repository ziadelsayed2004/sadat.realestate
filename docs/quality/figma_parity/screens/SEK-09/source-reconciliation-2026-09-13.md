# SEK-09 direct source reconciliation — 2026-09-13

The official Figma node `6027:5677` was read directly. The reviewed safe fixture now uses the source-supported identity values `محمد أحمد سالم` / `Mohamed Ahmed Salem` and `m.salem@email.com`. The existing 672px profile card, active personal-information tab, editable given/family name controls, disabled email projection, save action, validation, retry, and permission behavior remain aligned with the current account contract.

The source also contains a portrait, phone number, and city. Those fields are absent from the safe `/me` read and patch contracts, so the implementation does not invent them or restore legacy identity data. The source presents one full-name field while the contract intentionally patches `firstName` and `lastName` independently; the runtime keeps both contract-shaped controls to avoid ambiguous name parsing.

The complete affected AR/EN profile suite passed 24/24. It covers safe projection, visual baselines, saving only schema-shaped changes, failed-save retry without reload, permission denial, authentication failure, session recovery, and explicit no-overflow geometry at 1551, 768, and 393 pixels for both profile tabs. The updated visual baseline was verified again without snapshot-update mode; lint and `git diff --check` passed.

SEK-09 remains `PARTIAL_EXTERNAL` because avatar, phone, and city are not approved account-contract fields. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
