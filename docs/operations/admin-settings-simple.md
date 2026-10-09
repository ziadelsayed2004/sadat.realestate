# Simplified general settings

`/admin/settings` and `/admin/settings/platform` now distinguish the website's familiar name from the name stored in the platform settings record. The original-name card reads the same Arabic/English brand copy used by the public site. The saved-name card reads the loaded server record and stays unchanged while the administrator edits the inputs. It updates after a successful save response; an unconfigured language is explicitly marked as not saved.

“Use original name” fills both name inputs without submitting. “Discard my edits” restores the loaded settings and clears the reason/error. Other saved values, including additional settings and custom existing select choices, remain preserved. Nothing is populated or written automatically when an unconfigured page loads.

The platform editor separates names/descriptions, office details and optional additional settings. Names use single-line inputs. Language, currency and timezone use labeled choices; saved choices outside the standard options remain available. Versions and schema information are inside an optional save-details disclosure. Section descriptions and field guidance use plain Arabic/English. The save status distinguishes unsaved edits, saved values and an unconfigured record.

The platform name is descriptive data in the existing settings record. This change does not introduce a new public branding system or replace text embedded in the logo image. The page explains this and links to the website, SEO settings and the action log. Earlier recorded settings values can be inspected under the action log's Platform settings section; the familiar website name is not presented as an invented historical database value.

Settings help/copy uses a separate build chunk to remain within the existing bundle limits. The versioned save contract, reason requirement and authorization remain unchanged.

Validation: 19 settings web tests, 10 browser checks including Arabic/English desktop/tablet/mobile journeys, TypeScript, ESLint and production web build with the existing bundle budgets. The browser saves use local test routes; no production settings are changed. Deployment is required after pulling the commit.
