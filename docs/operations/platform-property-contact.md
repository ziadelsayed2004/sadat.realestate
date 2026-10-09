# Platform property contact requests

A request sent to the platform team for a published property previously depended on the company's approved provider profile and on the project's company association. A public property with a legacy project association or an unavailable company recipient could therefore return `REQUEST_NOT_FOUND` even when the customer chose the platform team.

Platform property requests now validate the published, active, unexpired property and verify any submitted organization/project identifiers against that property's references. Company/profile availability and company-project ownership remain required for direct company delivery. Standalone organization/project inquiries retain their target checks. Platform requests are saved for administration and do not enter a provider inbox or generate a direct-provider notification.

The property form validates the contact payload before submission, retains entered fields on failure, and distinguishes duplicate requests, rate limits, unavailable targets, invalid fields and server failures from network errors. Arabic and English messages are included.

Verification includes request API tests, form tests, responsive contact submission browser checks, and `node --import tsx scripts/verify-platform-property-contact-local.mjs`. The latter uses a unique temporary database on the local QA replica set, checks real HTTP creation and Mongo persistence, rejects forged targets and unauthorized roles, and removes its database afterward.

Deploy the web and API together through the normal production update. No database migration is required. Production customer submissions were not made during this change.
