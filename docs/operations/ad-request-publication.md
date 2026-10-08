# Publishing a customer advertisement

Payment approval, request scheduling and the advertising image have separate steps.

1. From **Financial review**, open the customer request using **Request details and scheduling**. Set a valid display window in Egypt time and schedule it after approving its payment receipt (or recording a payment waiver).
2. Choose **Prepare ad image and destination**. The editor loads the exact request, provider contact details, placement and display dates. An unavailable request cannot fall back to an unrelated banner editor.
3. Enter the advertising title and the full HTTPS URL of the property or developer page. Upload the advertising image, add the change reason and save. The receipt is not used as advertising artwork.
4. Publish the saved banner. The banner keeps an immutable `adRequestId`, while its placement and window must match the scheduled request. A paid request needs its own active, clean, approved proof at publication.
5. Use **View this request’s advertisements** to view and edit the linked banners. Visitors see **View advertisement** in the homepage hero and can open the chosen destination.

Previously created requests can use this workflow without a backfill. Existing standalone administrator banners retain their workflow. The public homepage excludes linked banners whose request has been cancelled, whose window has changed or whose payment is no longer approved without a recorded waiver.

For local verification, run `node --import tsx scripts/verify-ad-campaign-publication-local.mjs` with a local MongoDB replica set named `adcampaignqa` on port 27031. It uses a unique `qa_ad_campaign_…` database and drops only that test database afterward.
