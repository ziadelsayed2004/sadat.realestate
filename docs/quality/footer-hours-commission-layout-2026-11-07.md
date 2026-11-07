# Footer working hours and commission policy layout

- The shared public footer presents the configured working hours in an independent, centered green and gold card with a clock, localized heading and readable body text. It follows the navigation/contact columns on property pages and other public routes. Missing hours leave no placeholder.
- Commission policies use responsive cards instead of a nine-column table. Each card separates its identifier/status, labeled scope/rates/dates/version, and management controls. Long identifiers wrap; editing, reason input and activation controls retain their own space. Existing authorization, audit reasons and versioned save requests remain unchanged.
- Browser checks exposed a contact subscription race: another contact consumer could finish the shared bootstrap request between rendering the footer and registering its listener. The footer now reads the latest cached contact when subscribing, including when that cache is already fresh.

Validation: production client/server build and bundle budgets passed; focused commission tests (20) and public-contact tests (9) passed. Browser coverage checks Arabic/English on desktop, tablet and mobile, including long policy keys, opening the editor, saving sale/rent rates, control bounds and overlap, footer contact links and working-hours card placement. Generated captures remain in ignored test-results directories.

No production rates, settings or records were changed from this workspace. The normal deployment command activates this change.
