# Office location and homepage residents' posts

The shared footer already supported a configured map, but platform settings validated that URL against an empty projection, rejecting valid saves. The platform projection now validates its own values. Address and working hours are also editable beside the map in contact settings. Shared office fields use the latest saved values from either settings tab.

The footer opens the saved Google Maps URL in a new tab. If only an address exists, it opens a Google Maps search for that exact address. Explicit map URLs retain existing HTTPS and host validation.

The residents' cards are community posts. The admin community page now explains the three steps: the author submits a post, an administrator publishes it, and the latest three published posts appear on the homepage. No sample authors or fabricated testimonials are added.

Validation:

- Settings API suites: 10 tests passed, covering valid platform map saves, rejected unsafe links, shared-field precedence and clearing.
- Public contact and admin settings UI suites: 28 tests passed, covering localized office links, safe external-link attributes and address-only map searches.
- `node scripts/verify-office-location-local.mjs`: real local MongoDB, admin settings forms and public homepage; four cases across Chromium Arabic 390px and WebKit English 1440px. Both settings tabs saved successfully, and bootstrap plus footer showed the latest address/map. No browser errors or horizontal overflow. Settings restored and fixture audits removed.
- Result: `docs/quality/guide-runs/office-location-local-latest.json`.

No production data or office coordinates were changed. The owner supplies the actual office address and shared map link in `/admin/settings/contact`.
