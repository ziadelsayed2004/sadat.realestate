# Owner CMS and settings follow-up — 2026-10-24

Previous goal completed and pushed as `9127b15a`. This follow-up does not delete production data.

- [x] Homepage description clearing persists, including localized replacements.
- [x] Direct CMS edit links do not reopen the editor after saving or cancelling.
- [x] Repeated saves and stale versions give accurate results without losing the draft.
- [x] Explain every general settings field and its actual effect in the in-app admin guide.
- [x] Clear homepage section instructions and optional tip image URL guidance.
- [x] Live banner preview remains usable before saving/uploading/publishing.
- [x] Independent image titles, descriptions and links coexist with platform banners.
- [x] Inspect desktop, tablet and phone hero images and fix demonstrated display issues.
- [x] Focused API/UI checks and native Chromium/WebKit checks passed.

Delivery additionally requires the repository's full pre-push gate; the hook runs lint, type checks, all workspace tests, builds and bundle checks before accepting the push.

## Findings and verification

The CMS omitted `body` when both description fields were cleared, so the server retained the previous value. Updates now send an explicit null, which removes the stored description. Locale maps replace the previous map; a remaining translation is still the documented fallback. Published hero/About sections with no description do not silently restore default text. The direct `contentId` effect also reopened the editor after a successful save; it now opens each requested record once.

Banner slides optionally override their parent banner's title, description and destination. Overrides are associated with selected media IDs, checked by the contract, persisted with existing version/audit controls, removed when an image is removed, and projected consistently to homepage and public banner responses. Empty image fields inherit the parent content. Featured cards retain their existing verified destination editor. Existing banners remain valid without slide metadata.

General settings now have field-specific Arabic/English help and nine linked reference topics in the in-app admin guide. Legacy privacy switches that do not enforce the actual permission rules are retained in storage but removed from the editable controls. Stored currency/timezone/language preferences are explicitly distinguished from live per-property currencies, Egypt-time schedules and visitor language selection. Downloadable owner/staff guides and the searchable HTML catalog are generated from the same content.

Live production inspection confirmed that images load. A 2752×1536 landscape photograph was filling a 390×520 phone frame, cropping most of its width. Phone images now retain their natural ratio above the text, without the dark overlay. Desktop/tablet photographs extend behind the search panel to remove the solid navy side areas. The desktop overlay remains for text readability; no arbitrary global brightness increase was applied.

- Focused API: 23 passing tests, including clearing/replacement/stale versions and slide overrides/fallback/removal/unsafe URLs.
- Focused UI: 95 passing tests; the guide suite separately passes 25 tests, including field coverage and downloadable guide synchronization.
- Native real local API/MongoDB: [browser report](guide-runs/cms-settings-followup-local-latest.json), Chromium and WebKit, 390/820/1440 pixels, Arabic RTL at 390/1440, no mocked routes and no browser errors. Fixtures are restored/removed afterward.
- Screenshot evidence: `.tmp/cms-settings-followup/` (local artifacts, not committed).
- Type checking and lint passed locally; the mandatory push hook repeats the full project checks.

## Owner instructions after deployment

Open `/admin/user-guide?lang=ar#guide-settings-reference-platform` for the general settings reference. In a homepage section editor, clear both description translations and save to remove the description. The optional tip URL is a direct HTTPS image URL, not a destination link.

For a company advertisement, create a separate banner and keep the platform's existing records. Keep the original-introduction checkbox enabled if that introduction should rotate too. Choose images, expand each image's text/link editor, inspect the live phone/laptop preview, save, then publish. Saving a draft alone does not publish it.

Deployment remains the existing owner-run sequence: pull `main`, recover disk space, then `manage-production.sh update`. Production database cleanup is a separate reviewed operation documented in `docs/deployment/OWNER_OCT24_HANDOFF_AR.md`; this follow-up performs no production deletion.
