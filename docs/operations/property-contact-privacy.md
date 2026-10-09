# Property contact privacy

Property contact records belong to the protected provider and administration workflows. Public property details never expose the contact record, regardless of existing sharing flags, login status, an earlier customer request, or the legacy contact-visibility settings.

The provider contact form retains the private contact fields and removes the public-sharing switches. Saving writes all three legacy sharing flags as false. Existing records do not need a migration: the public API omits their contact records immediately after deployment. The public property screen also ignores contact records from older API responses.

Customer contact requests remain available through the platform. This change does not add paid contact disclosure or a company-contact exception. A future company-contact feature should use separately verified official company details with an explicit administration approval flow.

Deploy the web and API together using the normal production update. Verify that the provider can save their private contact details, that public property responses contain no contact record, and that a signed-in seeker can still submit a request without personal provider details appearing afterward.
