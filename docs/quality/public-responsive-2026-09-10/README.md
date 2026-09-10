# Public cards and advertisement responsive fixes

Status: verified locally; Production verification awaits deployment.

The listing and detail badges previously had styling only above 1100px. Shared responsive styling now keeps them separated over the image on phones and tablets. Listing provider identity now has a logo gap and a separate role line at every viewport. Detail transaction badges read the actual sale/rent value. Listing rows can grow with content instead of clipping at a fixed height.

The homepage advertisement combined a fixed aspect ratio, constrained text and line clamping. Its height now accommodates the complete title, body, price and action, with Arabic line height and wrapping preserved.

Validation:

- `public-card-banner-layout.spec.ts`: 18/18 passed, Desktop Chrome, Galaxy Tab S4 and Pixel 5, Arabic and English. Checks badge containment/backgrounds, correct rental label, provider layout, banner content containment and page overflow. These use API fixtures and prove layout, not backend journey completion.
- Public listing, details and homepage unit tests: 37/37 passed.
- Web typecheck, lint, translation check, client/SSR build and bundle budget passed. Final CSS total: 495524 bytes within 495616 bytes.
- Arabic screenshots for all three viewports are saved beside this report. Desktop and mobile banner plus mobile gallery were visually inspected.

No Figma parity percentage or Production completion is inferred from these checks. Existing Admin localization work remains a separate in-progress worktree change.
