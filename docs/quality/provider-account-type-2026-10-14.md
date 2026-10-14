# Provider dashboard account type — 2026-10-14

The dashboard heading now displays a localized “Account type” badge using the actual `application.providerType` already returned by the authenticated dashboard API:

- Individual property provider / مزوّد عقارات فردي
- Real estate brokerage office / مكتب وساطة عقارية
- Real estate development company / شركة تطوير عقاري

The badge appears below the welcome text and above metrics, including on empty approved accounts. It is visible on mobile without opening navigation. No new API request or inferred provider type is used.

Validation:

- Provider overview tests: 20 passed, including all three types in Arabic and English.
- Real local browser/API/MongoDB checks, without mocked responses: all three account types at Arabic 1440px, Arabic 390px and English 390px. Verified the correct label is visible above metrics and no horizontal overflow. Screenshots were reviewed. Synthetic accounts, profiles, applications, credentials and sessions were removed.
- Local build and typecheck passed. Client JavaScript is 2,587,765 bytes, within the existing 2,588,672-byte budget. Existing chunk and stylesheet limits are unchanged.
- Evidence: ignored `.tmp/provider-account-real/result.json` and screenshots. The full standard pre-push gate runs before upload.

No production data changes or deployment.
