# PRV-08 direct source reconciliation — 2026-09-13

The official desktop Figma node `6017:20391`, tablet node `6017:116402`, and mobile node `6017:118561` were read directly. The media route now uses the shared “Add a new property” heading before the eight-step rail on desktop/tablet, marks step 6 active, and highlights Add property in the provider navigation. The mobile composition hides the redundant desktop introduction, uses the compact step rail and 12px card geometry, and stacks full-width actions with Continue first.

The runtime preserves the approved media contract: authenticated owner-scoped JPG/PNG image upload, PDF floor-plan upload, MIME and extension validation, the 10 MB file-size limit, session-private ordering and removal, optimistic version handling, explicit unavailable existing-media projection, and storage-identifier privacy. Upload, reorder, delete, permission, conflict, and unavailable-storage paths remain connected to the real provider routes.

The Figma variants disagree about required image counts and maximum image counts, and show virtual-tour, YouTube, and brochure URL fields that are absent from the active provider media contract. No unsupported limits, non-persisting URL inputs, or fabricated existing-media records were introduced.

The focused AR/EN desktop baselines passed 2/2 during the intentional update and 2/2 in normal verification. Responsive AR/EN checks passed 4/4 at the mapped 1024×1042 and 402×1209 sizes, proving that the stepper, media card, dropzone, upload controls, and actions remain inside the viewport with no horizontal overflow. Client/server builds, translation validation, bundle budgets, typecheck, focused lint, and `git diff --check` passed.

PRV-08 remains `PARTIAL_EXTERNAL` for the missing optional-media fields, existing-media projection, and unresolved source-limit contract. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
