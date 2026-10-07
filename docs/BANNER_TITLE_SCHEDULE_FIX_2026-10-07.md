# Banner title and scheduling fix

The homepage previously used a managed banner's image while keeping the old CMS hero heading. It also never refreshed its initial banner data while the page remained open. Admin schedule entry and the banner list interpreted times using the device's time zone.

The published managed banner now supplies the visible localized heading over its own image. Its alternative text is projected separately for the image. With no managed banner, the existing homepage heading and image remain available.

Admin creation, editing, schedule preview and list dates use `Africa/Cairo`, with the summer/winter offset determined by the display date. Dates and times remain separate native fields, with complete midnight defaults. The hint explains that midnight ends at the beginning of the selected day, and that saving a draft must be followed by Publish / schedule.

An open, visible homepage checks banners every 30 seconds and when focus or visibility returns. This updates banner data without entering a loading state, replacing the search form or losing its selection. Temporary background failures preserve the current page; refreshes stop when the component unmounts or the page is hidden.

## Verification

- Production build, typecheck and lint passed; bundle limits were not changed.
- 48 targeted web tests and 21 API tests passed. Server rendering and contract tests also passed.
- 18 browser cases passed across Arabic/English desktop Chromium, mobile Chromium and iPhone WebKit: summer and winter schedules entered from an American device, exact UTC storage, publishing, reopening the same Cairo times, visible title/image pairing, background updates, search preservation and outage recovery.
- The existing banner guarantee script passed 10 checks against a fresh isolated local MongoDB replica set. It exercised transaction rollback, image attachment, overlapping-window rejection, publication, scheduled start/end boundaries, stopping display, and archiving; its test database was removed afterward.
- The dashboard guide and owner text explain the corrected title, alternative text and Egypt schedule behavior. The all-account guide check passed.

These are local checks. Production deployment is still required. Existing banners need no data migration; review their saved window in the editor if the previous device time zone was incorrect. A currently open homepage can take up to 30 seconds to reflect a banner change.
