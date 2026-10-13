# Published property editing and deactivation

Verified locally on 2026-10-13 with a newly registered, verified synthetic provider, an administrator, the real API, MongoDB replica set and browser. No production records were changed. Synthetic records and sessions were removed afterward.

- A provider can reopen their published property for editing. It becomes `needs_changes`, leaves public listings, and opens the existing editor. Submitting edited data requires administrative review even when automatic provider publication is enabled.
- A deactivation request saves its reason while the property remains published. A pending request blocks duplicate requests and reopening the editor.
- An administrator with `admin:properties.manage` can approve or reject using the current version and a decision reason. Approval hides the property; rejection leaves it published. The provider can see the saved decision and reason. Administrative restoration republishes a hidden property.
- The property attention queue includes deactivation requests only for administrators with management permission, and submissions only for those with review permission. The overview pending-review KPI includes both workflows.

Local verification covered actual browser submission, administrative rejection and acceptance, public accessibility before and after decisions, restoration, editing, resubmission, approval, audit records, stale versions and duplicate requests. Injected audit failures rolled back both provider mutations in MongoDB. Arabic and English layouts were checked at 320, 390 and 1440 pixels.

Targeted checks passed: 34 API tests, 33 web tests, lint, TypeScript, OpenAPI/Postman validation and production build. User guides and API route documentation were updated.

The client build increased from 2,559,126 to 2,566,572 JavaScript bytes (7,446 bytes, about 0.29%). The total allowance increases by a bounded 12 KiB for this workflow and its bilingual guide. Existing per-chunk and route stylesheet limits remain enforced.
