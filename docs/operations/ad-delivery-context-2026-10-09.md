# Advertisement identity and delivery context

Financial review previously offered a generic "prepare ad image" link without displaying the customer's brief or the selected placement. It always opened banner preparation, which could be mistaken for marking a property as featured. The placement select also showed a homepage fallback while settings were unavailable, even when a linked request specified a different placement.

## Result

- Financial details load the linked request separately and show its brief, requested type, actual placement and contact phone when supplied. Failure to load this context leaves financial details available and hides banner preparation until retry succeeds.
- Banner preparation is labelled with its actual placement and is offered only for requests with complete campaigns in waiting-payment, scheduled or active states.
- The page lists only banners filtered by the selected request. Each shows its status, destination URL and selected creative images using the existing authorized preview endpoint and image loader. Missing creatives, unavailable permission and failed image previews have distinct messages; receipts are never used as creative images.
- The banner editor repeats the request context and preserves the selected placement even when placement settings cannot load. It explicitly explains that banner publication does not set the Featured property badge.

## Operator workflow and limits

1. Read the request brief and confirm the advertised property, project or company and desired images with the requester using the recorded contact number/provider account.
2. A brief without a clear property name or URL does not identify a specific property. The current request contract accepts a brief and contact number, not an attached property selection or customer creative uploads. This change does not infer either from the provider's account or payment receipt.
3. Check the agreed placement and period in request details; approve payment or record the authorized waiver and schedule the request.
4. Prepare a banner in that placement, upload the agreed creative images and enter the public property/project/company destination URL. Save, then publish/schedule from the banners page.
5. Use the financial detail previews to review the prepared images and open the destination. Marking a property as Featured remains a separate feature; this change does not introduce automatic property promotion.

## Validation

- 20 Vitest checks across advertising administration and delivery context: request loading, real placement, finance preservation, selected images and destination, empty/missing campaign states, denied permissions, retry and placement fallback.
- Six Playwright runs: Arabic and English on desktop, tablet and mobile; linked customer brief, contact, two uploaded images, destination and draft status, no horizontal overflow, correct non-homepage placement after following preparation with placement configuration denied. Images load through the authorized same-origin media path and blob preview, respecting the existing CSP.
- Production web build, web TypeScript and ESLint for changed TypeScript files.
- The tests use fixtures and make no changes to live requests, financial approvals, banners or customer notifications.

Deployment remains the existing manual production update after pulling main.
