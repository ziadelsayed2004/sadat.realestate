# PRV-16 source reconciliation — 13 September 2026

The approved desktop export for Figma node `6017:21368` and stored responsive metadata for tablet node `6017:120752` and mobile node `6017:119345` were reviewed against the provider customer-requests runtime. The heading now uses the canonical description, the navy manual-request action and viewing-appointments link remain available, and the list keeps a single accessible title.

The request source column now renders the safe server-owned `sourceNote` when supplied, with the provider-account label as its fallback. Customer phone and email remain masked. Search, status filtering, pagination, request creation, optimistic transitions, loading, empty, retry, conflict, authentication, and owner permission behavior remain contract-shaped.

The canonical export includes aggregate status cards and richer priority, responsible-agent, follow-up, request-origin, and related inventory metadata. The provider projection deliberately omits admin assignment and due-date fields and exposes no priority or aggregate counts, so those values were not inferred from the current page or invented. PRV-16 remains `PARTIAL_EXTERNAL` until approved provider-safe projections exist.

Intentional AR/EN desktop baseline update passed 2/2 and normal no-update verification passed 2/2. Responsive AR/EN verification passed 4/4 at 1024×936 and 402×1282 with no horizontal overflow and usable filters/actions. Translation check, build and bundle budgets, typecheck, focused lint, and diff checks passed. Strict Figma totals remain 91/119 with 28 open. No Production launch or Demo purge ran.
