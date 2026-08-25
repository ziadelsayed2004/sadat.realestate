# Source of Truth

Use this precedence order when sources conflict:

1. Actual runtime behavior and executable tests after implementation begins.
2. Product truth in `01_product/PRD.md` and approved business rules.
3. Approved Figma frames for layout, components, states, and prototype behavior.
4. Drive folders linked to each Screen ID for final visual references.
5. The original developer handoff referenced in `09_sources/HANDOFF_REFERENCE.md`.
6. Agent Pack files as an execution plan, never as proof that runtime code exists.
7. Previous conversations and notes for context only.

## Approved Visual References

- [Public Website prototype](https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6017-10847&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4352&starting-point-node-id=6017%3A10847)
- [Authentication and Onboarding prototype](https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6017-16212&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4353&starting-point-node-id=6017%3A16212&show-proto-sidebar=1)
- [Property Seeker prototype](https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6027-3579&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4354&starting-point-node-id=6027%3A3579)
- [Property Provider prototype](https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6017-19032&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4355&starting-point-node-id=6017%3A19032)
- [Admin Dashboard prototype](https://www.figma.com/proto/Odl1Epn2u6lIEuIMmABT7o/Sadat-Real-Estate-%E2%80%94-UX-UI---Final--MCP?node-id=6017-61879&p=f&t=5p22yTz0XefwFXqg-0&scaling=min-zoom&content-scaling=fixed&page-id=6017%3A4356&starting-point-node-id=6017%3A61879&show-proto-sidebar=1)
- [Brand identity Drive folder](https://drive.google.com/drive/folders/1WIEzyhrC89da6zIxgQ_JqcWjFyxGPRJ2?usp=drive_link)
- Local immutable source inventory: `../09_sources/DESIGN_SOURCE_MANIFEST.json`.

## Current Analysis Boundary

- The handoff text, screen registry, states, roles, routes, and business rules were analyzed.
- Runtime truth must always be rediscovered from the current repository; the pack's original runtime snapshot is not permanent truth.
- Final screen exports, the design-system board, the handoff, and the flow hub are stored outside `agent_pack/` under `docs/design_sources/` so visual work remains reproducible while the pack stays English-only.
- Figma and Drive remain external references. Before any visual task, use its local export and, when accessible, open the actual frame and record the node or link in completion evidence.
- The older Market Home pack informed organizational structure and selector behavior only. No Market Home product truth may enter this project.
- The original handoff is not embedded in this English-only pack. Its repository-local path, identity, and checksum are preserved in `09_sources/HANDOFF_REFERENCE.md`.
