# Named advertising types

The assisted quote form displays `featured_card` as "إعلان مميز (كارت)" / "Featured ad card" and `banner` as "إعلان بصورة (بانر)" / "Image banner". The request summary uses the same labels. The empty selection asks the administrator to choose a type, and accessible helper text explains the image/text format separately from its display placement. Configured custom identifiers remain available; submitted values retain the backend keys.

Validation: 26 administrator advertising tests passed, including Arabic labels/summary and actual quote payload assertions for both placement variants. Typecheck and production build passed. A real local Mongo/API/browser run without mocked responses issued three quotes (Arabic 1440px/390px and English 390px), verified the persisted `featured_card` key and named request summary, and checked horizontal overflow. Temporary requests, quotes, account, settings, placement, notifications, audit entries and sessions were cleaned up/restored.

Evidence: `.tmp/ad-type-real/result.json`, screenshots in the same directory and `.tmp/ad-type-tests-final.log`. No production data or deployment changes.
