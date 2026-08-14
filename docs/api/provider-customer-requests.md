# Provider Customer Requests

Providers may create customer requests from an explicitly attributed lead source. The request is owned by the authenticated provider, starts in `new`, and uses strict bounded customer fields (`firstName`, `lastName`, `phone`, optional email/message/property/project references, and an optional source note).

The provider route never accepts a client-controlled status, assignment, seeker identity, or audit metadata. Seeker and unauthenticated callers are rejected, and provider list/detail projections are scoped to the authenticated provider. Contact details are retained only as request payload data required for the provider workflow; credentials and secrets are not accepted.
