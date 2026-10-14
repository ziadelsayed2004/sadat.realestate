# Featured advertising actions and public view

Date: 2026-10-14

The featured table now opens a separate read-only preview of saved content. Edit and Preview scroll/focus the work panel, including repeated clicks. Imported, unlinked drafts can be previewed without inventing an advertiser or publishing. Their legacy root-relative images now pass the same-origin media contract; HTTPS still works, while protocol-relative, escaped and traversal URLs are rejected. Valid approved advertiser accounts with an explicit null deletion field are no longer excluded.

Arrows submit unique positions when legacy rows have tied orders, retain original optimistic versions and report completion. Distinct existing order slots are preserved. Refresh reloads the list and current visibility.

The administrative list reports `publiclyVisible` using the actual public banner projection, once per list after authorization. It remains derived read metadata, separate from writable banner content. This avoids extra homepage API requests during administrative mutations. Only publicly visible rows offer "عرض في الموقع" / "View on site"; hidden rows explain why it is unavailable. The link selects the exact managed card on the homepage through `featuredAd`, even if another card precedes it. Draft previews remain available privately.

Verification:

- 20 targeted API tests passed across featured eligibility, media/preview contracts, administrative visibility and router boundaries. Forbidden reads do not resolve public visibility. Same-origin legacy image previews and rejection of unsafe URLs are covered.
- 54 targeted web tests passed across featured actions and homepage behavior, including read-only previews, focus/navigation, named visibility links, tied-order payload validation and exact carousel selection.
- Typecheck, lint, generated-guide check and production build passed during implementation. The normal pre-push gate checks the final committed snapshot.
- A real local Mongo/API/browser journey passed with no mocked responses: actual display setup, Arabic 1440px/390px and English 390px unlinked-draft image previews, distinct edit panels, real save/publish, real arrow reorder of tied rows, new-tab public link selecting the intended second card, and actual Stop removing that card from public display.
- Preview issued no content mutations. Editor/preview focus and mobile viewport overflow were checked. Synthetic users, roles, credentials, records, uploads, audit entries and sessions were removed; original local configuration and unrelated order metadata were restored. The test was paced to respect the normal API rate limit.

Evidence: `.tmp/featured-actions-real/result.json`, screenshots in that directory, and `.tmp/featured-actions-*.log`. The bounded total JavaScript allowance grows by 8 KiB from the 2,591,133-byte baseline for preview/navigation and guidance. Existing chunk and route stylesheet limits remain unchanged. No production data changes or deployment were performed.
