# Article editing, images and deletion

The article list shows each article's cover and available actions in a responsive card. Administrators with content management and publishing permission can edit published text and images without changing publication state. Draft editing retains its existing management permission requirement. Existing legacy image URLs are retained until a replacement or removal is saved.

In the editor, **Upload or replace cover** replaces the selected cover directly. **Add image** adds article images, with existing remove and use-as-cover controls. The preview displays the current selection before saving. Uploaded media still goes through the existing article image upload and validation flow.

**Remove from website** archives a published article so it can be restored. **Delete article** opens a separate confirmation with a required reason and permanently deletes the article record from administration and public access. Deletion checks the current record version, requires content management permission, and also requires publishing permission for non-draft records. Production uses the existing database transaction wrapper to retain the audit record atomically. No production article records were changed during implementation or QA.

Validation: 15 web component tests; 11 article service and HTTP tests, including published cover replacement/removal, deletion permission checks, stale-version rejection and public access removal; six browser scenarios for editing, cover replacement/removal and cancellation/confirmation of deletion in Arabic and English across desktop, tablet and mobile; web production build; web/API TypeScript checks; ESLint; OpenAPI and Postman validation. Browser scenarios use controlled API responses.

Deploy the web and API together through the existing native production update script, then reload the administrator page. Public responses may remain cached for their configured lifetime.
