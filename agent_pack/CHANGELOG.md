# Changelog

## 1.1.0 — 2026-08-12

- Converted Agent Pack instructions, product documentation, task catalog, task board, execution order, prompts, templates, and all 188 atomic tasks to English.
- Preserved Arabic as the primary RTL product locale and retained the existing English and Simplified Chinese product-localization requirements.
- Removed embedded Arabic display names from planning JSON and replaced them with English reference names plus runtime localization keys.
- Replaced locale-suffixed planning filenames with language-neutral English names.
- Moved the original Arabic handoff artifact outside the English-only pack and retained its filename, date, checksum, and external visual references in `09_sources/HANDOFF_REFERENCE.md`.
- Added an audit gate that rejects Arabic-script text and locale-suffixed filenames inside the Agent Pack.
- Added an execution-mode and timeout guard to the master single-task runner to prevent planning-only runs and unbounded package-registry waits.
- Preserved all task state and completion evidence. The selector remains derived from the current repository graph.
