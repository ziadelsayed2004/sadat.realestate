# Commission exception list presentation

The administrator exception list now uses separate cards instead of the wide table. Each card shows the account identifier and an account commission link, the commission value and status, the effective window, the exception reason and the record version. Action reasons and approval/stop buttons have a dedicated footer. Archived records have no mutation form.

The layout wraps for compact screens, preserves readable identifiers and long reasons, and keeps action controls at least 44px tall. Existing status filtering, pagination, authorization, version checks and API mutation behavior remain in use.

Validation: 18 existing commission component tests; six browser scenarios covering Arabic/English on desktop, tablet and mobile, including draft approval and active exception stopping through mocked API responses; browser screenshots reviewed; web production build, TypeScript and ESLint checks. Browser QA does not modify production commission records.

Deployment: update the production checkout and run the existing native production update script. Pushing the commit alone does not deploy it.
