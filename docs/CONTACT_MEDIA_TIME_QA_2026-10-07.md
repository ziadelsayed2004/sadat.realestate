# Contact, property video and Egypt viewing time

Implemented on 7 October 2026. Deployment to the public server is still required.

## Final behavior

- Admin contact settings control the platform phone, WhatsApp number and office address. Social settings expose Facebook and Instagram only. Blank values hide their buttons; invalid numbers and external social domains are rejected.
- WhatsApp links use validated numbers, consistent icons and explicit company/platform labels. Property messages include the property title and URL. Footer links support keyboard focus and hover. Button, arrow and sale/rent transitions respect reduced motion.
- A company inquiry is saved through the request API instead of submitting a form to login. Customers can choose the company directly or the platform as intermediary. Ownership is resolved on the server; providers cannot access other providers' inquiries. Successful sends preserve the form and show a visible confirmation and tracking link.
- Direct inquiries notify the receiving provider. Provider replies and status updates appear in the customer's request history and notifications. Platform inquiries enter the admin queue without assigning the company automatically.
- Viewing entry, display and rescheduling use `Africa/Cairo`. The offset follows the appointment date, including summer/winter changes. Viewing creation and changes notify the other participant. The admin viewing queue has readable details and a property link; viewing confirmations remain provider actions.
- Temporary session refresh failures preserve the authenticated screen and form. Public request actions refresh and retry once after an expired access token. Browsers supporting Web Locks serialize rotating refresh cookies across tabs. Revoked or expired refresh sessions still require login.
- Providers can upload MP4 files beside property photos, reopen saved media and delete them. The upload limit is 10 MiB; H.264/AAC is recommended. MP4 structure, size and malware scanning are checked before readiness. Videos cannot become the image cover. Published-property playback supports HTTP byte ranges and does not expose private storage keys.
- The dashboard guide and the ready-to-send owner text cover settings, video upload, contact destinations, notifications and Egypt time.

## Verification

- Typecheck, lint and production build passed. Existing bundle limits remain unchanged.
- API suite: 668 tests passed; the final viewing, attention and contact routing changes additionally passed 21 targeted tests. MP4 dotted phone-export filenames and range reads passed 2 targeted tests.
- Web: 581 Vitest tests and 86 Node tests passed.
- Browser: 30 tests passed across Arabic/English desktop Chromium, mobile Chromium and iPhone WebKit. Tests cover configured contact links, company/platform request destinations, preserved input, visible confirmation, Cairo time on an American device, video upload persistence/deletion and admin settings.
- OpenAPI, Postman, the 206-route API audit and the 26-journey / 7-account-type guide check passed.

## Scope and limits

- Browser API responses use controlled fixtures; these checks do not claim verification of live production data or delivery to real WhatsApp accounts.
- Windows WebKit does not provide the H.264 decoder used by real iPhones. Chromium playback was exercised; WebKit verifies the video controls and layout. Production video playback still depends on the uploaded codec being supported by the visitor's browser.
- Company contact currently depends on company/provider approval. There is no separate paid-subscription gate in this contact workflow; advertising requests and pricing are separate.
- WhatsApp and phone calls happen outside the site and do not create a tracked request. Use the inquiry form for recorded follow-up.

## Deployment and owner setup

Deploy with the existing native production **update** command. Set the real platform number in `/admin/settings/contact?lang=ar` and the page URLs in `/admin/settings/social?lang=ar`. Review company-owned numbers separately.

The owner message and all-account instructions are in [USER_GUIDE_ALL_ACCOUNTS_2026-10-06.txt](USER_GUIDE_ALL_ACCOUNTS_2026-10-06.txt).
