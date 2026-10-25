# Exact prices, upward locale menu and upload proportions — 2026-10-25

Requested follow-up combines three owner requests. The price implementation is in `dc8bfb7f` and its native evidence is [exact-price-local-latest.json](guide-runs/exact-price-local-latest.json). Its initial protected push stopped at a guide-completeness check (the new topic had two steps); the topic now has three actionable steps and the guide tests pass. This follow-up delivers the combined changes through a normal protected push.

## Price control

**General settings → Display settings → Round property prices to millions**: `/admin/settings/display?lang=ar#admin-settings-round_property_prices`.

Off is the default: EGP 3,250,000 is shown exactly, including any fractional component. On explicitly labels the approximation: “حوالي 3.3 مليون جنيه” / “Approx. EGP 3.3M”. The property amount, filtering, installments, structured data and comparison difference detection continue to use the stored amount. The native on/off/on-cycle evidence uses the real local admin control, bootstrap and SSR/hydrated public pages in Chromium/WebKit; no production price or setting was modified.

## Locale popup

The language switcher inside the floating public mobile menu opens above its trigger. Desktop/header switchers retain their existing placement. The popup keeps its rounded styling, scroll limit, locale selection and existing Escape/outside-closing behavior. This addresses the previously clipped popup at the bottom of the drawer.

The browser run also exposed an existing hydration mismatch on a fresh WebKit visit to `/` without `lang` or a locale cookie: SSR honored the English request header, while the early template script overwrote the document language with Arabic. That script now keeps the server-selected language as its fallback. A regression check covers both server languages and query/cookie precedence; the native run checks the document and hydrated route agree.

## Image proportions

Shared upload guidance is shown before the chooser in provider/admin property media, registration/company editing, projects, articles, team portraits, taxonomy images, featured ads and banners. Proofs, identity documents, PDFs and videos keep their document/media-specific instructions.

| Upload | Recommended width:height | Display behavior |
| --- | --- | --- |
| Property photo | 3:2 | Shared 3:2 home/search/comparison/profile cards and gallery; `cover` crops a different shape proportionally |
| Logo / taxonomy / portrait | 1:1 | Logos preserve the complete source; portrait/category frames may crop |
| Company cover / project / article | 16:9 | Responsive company covers may crop; project natural cards and saved display choice remain; article hero keeps natural proportions |
| Homepage banner | 3:1 source | Same source on phone/desktop; keep key artwork centered and inspect both previews because the frame changes |
| Featured advertisement | 3:2 source | Responsive side/top image layout; preview both screens |

These are shape guidelines, not resolution requirements. Any proportionally equivalent pixel dimensions qualify, with a small tolerance for rounding. Existing file/MIME/size/advertising validation remains. Selecting an image shows its actual reduced aspect ratio and a warning for a different shape. The warning does not reject, resize or rewrite the uploaded file. Browser orientation-aware image decoding reads its display dimensions and object URLs are revoked after reading. The original remains available through the existing property viewer.

Obsolete fixed image heights and the phone-only natural-image override were removed where they contradicted the 3:2 property guidance. Images use a bounded proportional frame with `object-fit: cover`; no stretching is introduced. Video and PDF viewers remain separate.

The homepage property section now grows with its cards. A native geometry check caught the former fixed height allowing cards to extend into the following section; the final checks assert cards stay inside their section at every tested width.

Verification includes focused ratio/guide/property tests and the local native script `node --import tsx scripts/verify-upload-guidance-local.mjs`, using real scanned property uploads, matching/mismatched shapes, public frame geometry and upward locale selection in Chromium/WebKit. Evidence: [upload-guidance-local-latest.json](guide-runs/upload-guidance-local-latest.json). The script is restricted to the local Mongo port and removes only its own fixture records/files. Full checks run on the committed snapshot before GitHub upload; deployment is a separate server update.

Final native result: **PASS_LOCAL**, 18 viewport/language groups, no browser errors, fixture cleanup complete. Property frames and section boundaries pass at 390/820/1440px in both engines; the upward menu passes Arabic/English at 320×568, 390×844 and 390×360. An additional Arabic provider-upload inspection at 390px shows the ratio guidance inside the viewport with no horizontal overflow. The locale regression suite passes all 11 checks. The client build passes its bounded budgets (2,794,952 JavaScript bytes; largest route CSS 275,442 bytes); the shared bilingual guidance has an 8 KiB allowance while per-chunk and stylesheet limits remain unchanged.
