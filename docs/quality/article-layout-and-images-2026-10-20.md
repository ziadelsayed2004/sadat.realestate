# Article layout and image rules — 20 October 2026

The reported article and both healthy examples were inspected through their real public API and rendered production pages. This was read-only. The images in the reported article all decoded successfully. Its unbroken Arabic paragraph caused intrinsic grid sizing to expand the document to **2076 px on a 390 px viewport**. Images inherited the expanded width; its extra images were also stacked as separate figures. Both healthy examples stayed at 390 px because their text contained normal word boundaries.

Implemented rules:

- Article layout columns, hero, body, related content, headings and pasted text have bounded intrinsic widths. Long unbroken text wraps without truncation, rewriting, inserting characters or rejecting legitimate article content. Paragraph/newline formatting is retained.
- The cover and additional images form one shared slider, also used by the administrative preview. At most 13 distinct sources are displayed: one cover plus twelve gallery images. Only one image is mounted at a time. A repeated cover/gallery source is shown once.
- Each slide fits inside a bounded responsive frame using `object-fit: contain`; portrait, landscape and very wide images do not crop, stretch or determine document width. Single-image articles have no redundant navigation controls.
- The slider supports previous/next controls, direct image selection, a position counter, RTL/LTR keyboard arrows, Home/End and horizontal touch swipes. There is no automatic motion. Vertical scrolling/pinch zoom remain available.
- Missing or undecodable sources are skipped, including failures that occurred before hydration attached event handlers. The remaining slides and text stay usable. If every source fails, a compact explanatory placeholder replaces the image area, and the body remains readable. Unsafe source schemes are excluded; controlled blob URLs are accepted only by the administrative preview.
- Existing upload controls continue rejecting corrupt bytes, unsupported formats, MIME mismatches, oversized files, excessive pixels, animated inputs and malware before storage. Real article-upload tests confirm rejected files create no photo records and preserve the editor's entered text. Scanned images retain the existing normalization/orientation/metadata stripping pipeline.
- Article saves normalize a cover repeated in the gallery, including a cover changed to an existing gallery image. Administrative and public read projections also normalize legacy duplicate references, preventing invalid stored galleries from blocking the editor; the slider remains defensive about repeated sources. Existing production article and image records are not deleted or rewritten by this delivery.

Validation:

- Focused frontend tests cover slider buttons, RTL/LTR keyboard and touch navigation, duplicate/unsafe/missing/failed sources, empty galleries and restricted blob previews, alongside public article and administrative editor regressions.
- API regressions cover cover/gallery normalization. Existing image-validation tests cover corrupt, unsupported, oversized, mismatched and infected uploads.
- `node --import tsx scripts/verify-article-image-rules-local.mjs` exercises real local HTTP/MongoDB, scanned uploads, a missing pre-hydration cover, a fixture-owned stored image whose bytes are damaged after upload, duplicate legacy references, all-images-failed fallback, long Arabic text, portrait/panorama fitting, both healthy example articles, and administrative preview/upload failure. It uses Chromium and WebKit at 320/390/1440 px with no intercepted responses. Synthetic records/files are cleaned afterward. Rate limiting remains enabled and the script waits for its window when needed.
- Full TypeScript/lint/tests/build run through the normal guarded GitHub push. The shared slider adds approximately 3.5 KiB of JavaScript; the bounded total increment is four KiB, with unchanged per-chunk and route-stylesheet caps.

Machine-readable browser evidence: [article-image-rules-local-latest.json](guide-runs/article-image-rules-local-latest.json). Local captures are in `.tmp/article-image-rules`; the original read-only production comparison is in `.tmp/article-hardening`.

This updates source/GitHub and applies to articles automatically when the new build is deployed. It does not edit production article content, replace the client's images, or deploy the site.
