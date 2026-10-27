# Quality evidence

Text reports and structured verification results live here. Generated screenshots,
videos and trace archives are ignored by Git. New local captures belong under
`.local/` or Playwright's ignored output folders.

Historical captures removed from tracking on 2026-10-27 are retained locally under
`.local/generated-artifacts-archive/docs/quality/`. Earlier Git revisions also
retain the published historical evidence. Paths in historical reports describe
those historical runs, not required inputs to today's build.

The one screenshot explicitly required by the current release-comparison ledger
remains tracked through a narrow `.gitignore` exception. Approved design inputs
are under `docs/design_sources/final_screens/`; Playwright golden baselines are
under `apps/web/tests/e2e/__snapshots__/`.
