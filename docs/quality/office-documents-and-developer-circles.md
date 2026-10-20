# Office documents and developer directory circles

The current office policy uses `2026-10-15.office.1`. Application metadata accepted that version, but upload and saved-document responses only accepted untagged versions. A real local browser reproduced a clean HTTP 201 upload rejected by the client, followed by a failed document screen on refresh despite a successful HTTP 200 metadata response. Both responses now reuse the application's version validator, preserving legacy versions and strict private metadata validation. OpenAPI matches the shared rule. Already saved clean files can load without uploading them again.

Returned scanner `failed`/`timeout` outcomes now remain `scan_failed` instead of being classified as infected. Retrying identical bytes after a failed scan scans the existing private file without creating another record or version. Clean, infected, and in-progress replays retain their previous behavior. Conditional state updates prevent two attempts claiming the same scan. Storage/scanner readiness and authorization still apply.

Every developer directory card now has a 64px circular thumbnail. It tries the company logo, then the cover, then the site's logo, including broken-image fallbacks. Company logos fit in full; cover thumbnails fill the circle. The wrapper prevents mobile cover dimensions from stretching the logo.

Local verification:

- `node --import tsx scripts/verify-office-documents-local.mjs`: real local HTTP, MongoDB and browser interactions, Chromium/WebKit, Arabic/English, 390px/1440px. JPEG/PNG, Arabic and timestamp filenames, refresh persistence, idempotent retries, corrupt replacement rejection, private metadata, and successful office submission.
- `node --import tsx scripts/verify-developer-circles-local.mjs`: five image states across Chromium/WebKit at 320px/390px/1440px, 30 thumbnail checks, loaded images, circular dimensions, correct fitting, and no horizontal overflow.
- Upload contract, scanner recovery, concurrency and directory fallback regression tests; lint, TypeScript, OpenAPI validation, and production build/bundle limits.

Reports are in `docs/quality/guide-runs/office-documents-before.json`, `office-documents-local-latest.json` and `developer-circles-local-latest.json`. Screenshots are in `.tmp/office-documents` and `.tmp/developer-circles`. Fixtures are synthetic and cleaned up. Upload browser checks use the local configured scanner; no production documents or accounts were changed.
