# Admin project list and public visibility

The project list now uses project names instead of technical IDs, slugs and versions. The names open the project details. Publication status and actual public visibility are separate columns, with links to the company and project pages where available. The page and operating guide explain that projects appear within their developer company’s public page.

Public project links use the same organization projection as the public project page. This includes provider approval, verified account, current commission acknowledgement, valid company slug and membership in the public projects projection. Concurrent rows for the same company share only an in-flight lookup; results are not retained after completion. Existing public visibility rules are preserved.

Small-screen fixes cover the project heading, filters, pagination and account controls at 320px. Desktop and mobile lists retain detail, edit, publish/review and archive actions according to permissions; archive-only projects do not show a redundant review button.

Validation:

- API project tests: 13 passing, including visibility changes, missing acknowledgement, restricted accounts, invalid slugs and concurrent lookups.
- Web project tests: 11 passing across Arabic and English, including real public links versus unavailable projects and removal of technical codes from the list.
- Real local MongoDB/API/browser workflow, without mocked responses: Arabic and English at 1440px, 390px and 320px; named rows, correct company/project links and no horizontal overflow.
- Real browser edit and preview saved a published project and preserved publication; the public page displayed the saved name. Approved and archived projects were absent from the public company projection.
- Removing the synthetic company’s commission acknowledgement removed both its public profile and the project’s public link consistently.
- Synthetic records, sessions and edit audit entries were removed after the run.

Evidence: `.tmp/admin-projects-real/result.json` and screenshots in `.tmp/admin-projects-real/`. Build and type checks passed; the full pre-push gate runs against the committed changes. No production deployment or production data changes were performed.
