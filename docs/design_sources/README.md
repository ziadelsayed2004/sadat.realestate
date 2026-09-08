# Design Source Inventory

This directory stores the user-supplied visual source artifacts outside `agent_pack/` so the execution pack remains English-only while frontend work remains reproducible offline.

## Contents

- `brand/brand-design-system.png` — final high-resolution Design System board.
- `brand/sadat-real-estate-logo.png` — approved product logo extracted byte-for-byte from the checksum-verified developer handoff.
- `handoff/developer-handoff.source.html` — checksum-verified developer handoff source.
- `handoff/prototype-flow-hub.source.html` — supplied prototype flow hub.
- `final_screens/` — normalized English-only filenames for the final screen exports.

## Mapping Rules

- The canonical mapping is `agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json`.
- Each Screen ID maps to one or more local files plus its supplied Figma prototype and Drive reference.
- `ADM-44` intentionally has list and create variants.
- `PRV-22-1`, `PRV-22-2`, and `PRV-22-3` are separate settings variants.
- One unlabeled phone-verification export is retained under `final_screens/supplementary/` and is not treated as a new Screen ID.
- `ADM-18` maps to the recovered Figma frame `6017:69276`, named `Sadat Real Estate`; direct source evidence was captured on 2026-09-08. Runtime parity is tracked separately.
- `ADM-54` uses the owner-approved local `ADM-54.owner-authored.html`/`.png` under `DESIGN-DECISION-ADM-54-AUTHOR-001` (2026-08-25). The historical Figma frame remains unavailable.

## Brand Rules

- Use Cairo for the approved typography family.
- Use the typed tokens and CSS variables in `apps/web/src/features/design_system/`.
- Never use the DOT Studio logo as the Sadat Real Estate product logo.
- Do not redraw or reinterpret the approved product logo.
