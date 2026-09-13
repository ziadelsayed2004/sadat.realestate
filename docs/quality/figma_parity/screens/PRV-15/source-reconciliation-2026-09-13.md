# PRV-15 source reconciliation — 13 September 2026

The approved desktop export for Figma node `6017:21162` and stored responsive metadata for tablet node `6017:120496` and mobile node `6017:119219` were reviewed against the provider projects runtime. The page now keeps one visible page title, preserves an accessible visually hidden heading for the project-list region, and uses the canonical navy Add new project action.

The runtime continues to render only the safe, server-owned project list projection: localized name, slug, status, review reason when present, updated date, permitted actions, and the paginated total. Search, status filtering, clear/apply behavior, loading, empty, error/retry, owner permissions, and action gating remain functional.

The canonical export includes aggregate status cards plus project image, area, type, execution progress, total units, available units, and richer inventory columns. `projectDataSchema` and the provider list response do not expose those values or safe aggregates, so they were not invented. PRV-15 remains `PARTIAL_EXTERNAL` until those approved projections exist.

Intentional AR/EN desktop baseline update passed 2/2 and normal no-update verification passed 2/2. Responsive AR/EN verification passed 4/4 at the mapped tablet and mobile widths with no horizontal overflow. Build and bundle budgets, typecheck, focused lint, and diff checks passed. Strict Figma totals remain 91/119 with 28 open. No Production launch or Demo purge ran.
