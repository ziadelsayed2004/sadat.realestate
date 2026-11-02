# Property company logos and category editing

Property source avatars now use the organization's dedicated `logoUrl` across
homepage, search, details, comparison and related request/viewing cards. Company
cover images remain cover images. Missing logos do not silently use a company
cover; homepage identities show their initial instead. Existing owner photos and
subscription visibility continue through their existing identity projection.

Homepage avatars are 52 CSS pixels and search avatars are 44 CSS pixels, with
contain fitting and space inside their circular frame so the full logo is visible.

The administrator property editor now loads the managed category/type catalog and
saves `propertyTypeId` in its single atomic administrative update. The selected
type determines the category, matching search and provider editing. Choosing a
different category clears the previous type and requires selecting its new type
before saving. Version-conflict merging retains the administrator's type edit.
The strict request schema and OpenAPI document include the editable type.

An owner saving details of an existing published property first starts its owned
edit draft when the server offers `start_edit`, then saves against that working
version. The original listing remains public until the owner submits for review.
The start-edit request supports the same explicit expired-session renewal as the
subsequent write; network failures do not automatically replay a mutation.

Validation: 84 focused web tests, 27 focused API tests and 43 public API regression
tests pass. Twelve production-browser scenarios pass on desktop/mobile in Arabic
and English: complete logo rendering, administrator category editing with reload,
and published-owner category changes against the working draft version. Lint,
type checking, OpenAPI validation and production build pass. The normal pre-push
gate must also pass before upload.

The first full gate exposed a pre-existing request-filter workflow exceeding its
five-second deadline under concurrent jsdom load. Its button queries now target
the pagination/filter controls instead of traversing the whole administration
shell, and that multi-step workflow has a local 15-second deadline. All assertions
about paging, filter persistence and unread acknowledgement remain intact; the
24-test request suite passes after this adjustment.

The added administrative category editor and published-owner handling add roughly
3.2 KiB to the previous JavaScript output. A bounded four KiB budget increment
keeps per-chunk and route stylesheet caps unchanged; final public route CSS is
278,960 bytes under its 279,040-byte cap. Generated browser captures stay ignored.
