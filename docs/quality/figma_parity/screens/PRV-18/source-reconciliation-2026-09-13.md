# PRV-18 source reconciliation — 13 September 2026

The approved desktop export for Figma node `6017:21613` and stored responsive metadata for tablet node `6017:121591` and mobile node `6017:119785` were reviewed against the existing grouped viewing-appointments runtime. The prior page implementation already follows the canonical date groups, compact time tile, customer/property/location hierarchy, status, and versioned appointment actions.

The stale desktop browser fixture was corrected to use the safe enriched viewing projection already exercised by the responsive test. Reviewed AR/EN baselines now show the customer name, localized property name, and localized location instead of raw fallback references. Provider and seeker identifiers, internal notes, audit data, tokens, and storage fields remain absent.

The source shows an assigned agent, but the provider viewing projection has no provider-safe assigned-agent relationship. `providerId` is ownership and is not evidence of an employee assignment, so no agent was inferred. Pagination and the optional filter disclosure remain functional adaptations. PRV-18 remains `PARTIAL_EXTERNAL` for the missing approved assignment projection and strict pixel acceptance.

Intentional AR/EN desktop baseline update passed 2/2 and final no-update verification passed 2/2, including filtering, keyboard focus, safe projection, and horizontal containment. The existing mapped responsive suite uses the same enriched projection at 1024×944 and 402×1042. Focused lint and diff checks passed; no runtime bundle changed. Strict Figma totals remain 91/119 with 28 open. No Production launch or Demo purge ran.
