# Agent Pack Language Policy

## Planning and Execution Language

Every file inside `agent_pack/` must use English for instructions, task titles, goals, reports, templates, and generated text. File names must not use locale suffixes such as `_AR`.

The integrity audit enforces this rule by rejecting Arabic-script characters in Agent Pack text files. Original Arabic visual and handoff artifacts remain outside `agent_pack/` under `docs/design_sources/` and are referenced by English metadata rather than embedded in this English-only pack.

## Product Language

This policy changes the language of the Agent Pack only. It does not change product localization requirements:

- Arabic (`ar`) is the primary visual product locale and uses RTL direction.
- English (`en`) uses LTR direction.
- Simplified Chinese (`zh-CN`) uses LTR direction where required by the PRD.
- Shared routes, components, permissions, and API contracts must work across supported locales.
- UI translation keys and localized CMS values belong in the application runtime, not as Arabic prose in Agent Pack task definitions.

Any change to the supported product locales requires an approved product decision; it cannot be inferred from this language policy.
