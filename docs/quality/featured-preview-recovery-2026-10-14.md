# Featured advertisement preview recovery

Verified locally on 2026-10-14 with the real browser, API and MongoDB. A synthetic eligible advertiser, published destination, draft advertisement and uploaded image were created only in the local QA database and removed afterward.

The preview download previously bypassed the administrative authentication middleware and did not refresh expired credentials. Token verification failures became generic server errors. It now returns 401 for invalid or expired credentials, enforces the existing administrative session policy, and refreshes once before retrying. Anonymous draft access remains unavailable, and permission errors do not trigger refresh loops.

The editor separates image-preview failure from save failure, offers a preview retry, retains unsaved text and refreshes the preview after a successful save. Late preview responses release their object URLs if the editor has closed. The featured content container has an explicit full width so its saved-ad table does not stretch the editor beyond mobile viewports.

Validation:

- Five API route tests passed, including expired/malformed credentials, wrong role, anonymous draft denial and authorized image delivery.
- Fifty-one targeted web tests passed, including one-time refresh, repeated failure, invalid response content, retry with retained text and object-URL cleanup.
- Real browser runs in Arabic and English redirected individual requests to actual expired-token and missing-image responses, then verified session renewal, preview retry, retained edits, draft saving and decoded images. No response was mocked. The preview fit widths of 320, 390 and 1440 pixels.
- TypeScript, lint, OpenAPI validation and production build passed. Synthetic files, records, audit entries and sessions were cleaned up.

This verifies the repaired local workflow. Production deployment and the affected production image file were not modified or verified.
