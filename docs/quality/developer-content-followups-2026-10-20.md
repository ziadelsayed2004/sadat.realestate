# Developer account and content follow-ups — 20 October 2026

Scope: the two supplied WhatsApp recordings, the latest screenshots/links, and reconciliation against the two previous client batches. The recordings are evidence of the reported behavior; they do not authorize production changes or additional account actions.

## Current changes

- [x] Community category creation is already implemented: **Community → Community categories — add a category**. Authorized moderation staff can add a localized category and it appears in the public composer and filters. Reviewed again with the previous-batch journey.
- [x] Article detail covers display the entire image with `object-fit: contain`, including portrait images and text/logo artwork. The rule applies at mobile and desktop widths.
- [x] Article cards use an explicitly editable short description (`seoDescription`) when supplied. Legacy content falls back to a short text-only opening. Full article content remains inside the article. Duplicate publication/reading-time blocks were removed from cards.
- [x] Article editors expose an optional public author name. This is presentation metadata; the authenticated creator ID and permission checks remain authoritative. Clearing the override restores the available registered-name fallback. Missing names are described plainly.
- [x] An audit/article link can open the intended editor even when the record is outside the current list page. The new single-record administrative GET requires `admin:content.view`; it cannot expose drafts to anonymous or non-administrative accounts.
- [x] Developer registration includes an optional company-cover upload, an authenticated preview, removal, and bilingual guidance. The image is saved with the application and visible in administration before acceptance. It is private until attached to an approved, publicly visible company.
- [x] Registration covers reuse scanned image upload/storage. Only owned photo records can be attached. Pending applications can preview their cover but cannot replace it until editable again. Approval carries the validated image into a newly created company profile; existing company edits are preserved.
- [x] Initial property creation renews stale/expired provider claims and retries once, matching later edit steps. The real journey reproduces approval after login, receives the original 401/403, refreshes, and creates a property with the approved developer's organization without signing in again. Forbidden accounts remain forbidden.
- [x] The property form chooses a project by its name from the provider's own bounded, searchable, paginated catalog. Standalone listings need no project. Failed catalog reads preserve the saved selection. Technical implementation notes were replaced with a plain explanation of the next steps.
- [x] Opening notification details first persists the read receipt. Returning/reloading keeps it read. Review categories have readable Arabic/English labels. Account-activation notifications use a helpful public message rather than a raw internal code or the administrative approval reason, including older activation notifications displayed by this UI.
- [x] Owners save company name, description and cover directly from settings. The internal change reason is recorded automatically; administrative editing still requires its explicit reason.
- [x] New property categories without images use the normal site logo. The previous category-slider browser journey now explicitly checks the default image URL and successful image loading for a new parent category.

## Previous requests reconciled

The implementation and evidence are in [19 October](client-followups-2026-10-19.md), [the interrupted follow-up](client-followups-2026-10-19-addendum.md), and [20 October](client-followups-2026-10-20.md). Their browser/service journeys are rerun for this delivery:

| Previous request | Retained behavior |
| --- | --- |
| Area selector/search | Arabic/numeric search, unmatched-search recovery, full selectable catalog. |
| Editing published properties | Opening/saving/leaving an editor keeps the accepted listing public; explicit submission withdraws it for review. |
| Community notifications and report indicators | Per-administrator, per-revision receipts; unseen items remain unread; resolved reports lose the red indicator. |
| Custom advertising roles | Necessary reading prerequisites accompany the authorized pricing/scheduling/payment actions. |
| Homepage cover and arrows | RTL/LTR arrows, text overlay and search overlap verified in WebKit at mobile/desktop widths. |
| Office/developer login | Registration draft/resume contracts accept the namespaced office requirement version. The current developer journey also starts from fresh email OTP registration. |
| Toasts | Message, action and dismiss controls have separate space and wrap without overlap. |
| New property classifications | Active parent categories and types appear on the homepage without first visiting listings; the homepage remains a one-row slider. |
| Photography guidance | Three illustrated examples remain beside the provider media uploader. |
| Possible duplicates | The entry list is explicitly a property selection step, not an assertion that every property is a duplicate. No automatic removal. |
| Banners and featured advertisements | Sole eligible destinations are automatic; linked dates point to request scheduling; saves retain original timestamp precision. |
| Homepage content, Tips and About | Live text previews, public placement links, supported legacy-key reassignment and editable images. Hero fallback/banner priority is explained. |
| Location and working hours | Configured map opens from the footer address; office hours render publicly. |
| Commission history and roles | Associated account names; deletion of unassigned roles with assigned-role protection. |
| Audit explanations | New CMS changes store readable before/after values and record links; old unrecorded text cannot be reconstructed. |

## Verification

- `node --import tsx scripts/verify-developer-content-followups-local.mjs`: real Chromium/WebKit, fresh email OTP, scanned image upload, company draft save, private/public image access, four-document submission, administrative cover review/approval, stale-claim property creation, persisted notification receipt, project-by-name selection, owner settings save, linked article editor, public descriptions/authors and full-cover layout at 320/390/1440 pixels. No intercepted responses. Created database records/files are removed afterward.
- `verify-oct19-property-edits-local.mjs`: isolated transaction, media, submission, rollback and receipt checks.
- `verify-oct19-followups-local.mjs`, `verify-oct19-browser-local.mjs`, `verify-oct20-followups-local.mjs`: previous-batch browser regression journeys. The first additionally asserts the new category's default site logo loads.
- Focused tests cover article metadata creation/removal, protected administrative reads, image ownership, stale-create retry and the affected registration/notification/content flows. The normal guarded push runs lint, TypeScript, the complete API/frontend suites and the production frontend build.
- OpenAPI/Postman cover the additive image/byline fields and guarded single-article GET. Both artifact validators pass.
- The measured JavaScript feature increase is about 10 KiB over the previous delivery. Existing headroom plus six KiB bounds it; per-chunk and route-stylesheet limits remain unchanged.

Results: [developer/content journey](guide-runs/developer-content-followups-local-latest.json), [property edits](guide-runs/oct19-property-edits-local-latest.json), [slider/toasts/photography](guide-runs/oct19-followups-local-latest.json), [community/roles/hero](guide-runs/oct19-browser-local-latest.json), [CMS/advertising/settings](guide-runs/oct20-followups-local-latest.json). Local screenshots are in `.tmp/developer-content-followups` and the existing batch capture directories.

The delivery updates source and GitHub. No production account, application, category, content or setting is changed by these tests, and this work does not deploy the production site.
