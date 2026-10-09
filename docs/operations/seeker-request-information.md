# Completing a request that needs information

The seeker sees “Waiting for your information”, the team's latest information request, a reply field and a send button. Sending a reply keeps the existing request ID, stores the customer's message in its public conversation history and moves it back to `under_review`. Administration sees the customer-supplied information in the request details. Direct company recipients can also read it in their inquiry details.

The existing seeker transition endpoint accepts `start_review` with `customerMessage` only when the authenticated owner’s request is in `needs_information`. A nonempty reply and the current version are required. Ownership, version checks and audit persistence remain enforced. The database transition and message are rolled back together if the audit write fails. Customer updates have an optional `authorRole`; older entries continue to display normally. No new request is created by a reply.

“New request” opens a separate form on both the list and detail pages. It records a new platform contact request and provides its tracking link. From a property request, it retains that property's context and pre-fills available customer name/phone fields. It does not copy the old message. Errors retain the entered information.

Validation covers the seeker/admin/provider views, request service permissions, responsive Arabic/English browser journeys and `node --import tsx scripts/verify-request-information-local.mjs`. The latter uses and removes a unique local QA database, checks audit rollback and verifies that the same request re-enters the administration review queue.

Deploy contracts, API and web together using the normal production update. No data migration is required. Any rollback must retain support for the optional customer-update author field so newly stored replies remain readable. No production request was changed during development.
